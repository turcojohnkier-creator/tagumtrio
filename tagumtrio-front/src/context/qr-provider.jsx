import { useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { QRContext } from './qr-context'
import { DEPARTMENTS } from '../constants/departments'
import { buildDepartmentQrSummary } from '../constants/qr-scan-fields'
import {
  createAttendanceApi,
  fetchDepartmentRequestsApi,
  fetchEmployeesApi,
  fetchDailyReportsApi,
  fetchPayrollPaymentsApi,
  fetchPayrollCyclesApi,
  fetchProductionApi,
  createDepartmentRequestApi,
  approveDepartmentRequestApi,
  redirectDepartmentRequestApi,
  submitLeaveRequestApi,
  fetchLeaveRequestsApi,
  approveLeaveRequestApi,
  rejectLeaveRequestApi,
  headVerifyAttendanceApi,
  leadmanVerifyAttendanceApi,
  submitDailyReportApi,
  releasePayrollApi,
  hasAuthToken,
} from '../lib/api'
import { enqueueScan, pendingCount, trySyncOnce } from '../lib/offline/queue'

const STORAGE_KEY = 'triops-demo-state'
const LEADMAN_DEPARTMENT_KEY_PREFIX = 'triops-leadman-selected-department:'

const DEPARTMENT_RATES = {
  Sundry: 70,
  Sorting: 70,
  Assembly: 70,
  'Cold Press': 75,
  Repair: 70,
  'Hot Press': 75,
  Putty: 68,
  Sunder: 70,
  Spreadersizer: 72,
  'Packing/Classifying': 70,
  'Putty Make Up': 68,
  'Sand Paper': 70,
  'Paint Black': 72,
  Bundle: 70,
  Logo: 70,
}

/* Demo employee data removed. Prefer server-provided employees.
   Fallbacks are empty arrays to avoid showing demo data in production. */

function toEmployeeRecord(employee) {
  const raw = employee?.employeeId ?? employee?.identifier ?? employee?.id
  const parsed = Number(raw)
  return {
    employeeId: Number.isFinite(parsed) ? parsed : undefined,
    employeeName: employee.employeeName || employee.name,
    department: employee.department,
    role: employee.role,
  }
}

function mergeEmployees(remoteEmployees = []) {
  if (Array.isArray(remoteEmployees) && remoteEmployees.length > 0) {
    return remoteEmployees.map(toEmployeeRecord).filter((employee) => employee.employeeId)
  }

  // No demo fallback: return an empty list when server data is unavailable.
  return []
}

// Demo builders removed. Fallbacks below use empty arrays to avoid showing demo data.
const DEFAULT_STATE = {
  departmentRequests: [],
  attendanceRecords: [],
  payments: [],
  leaveRequests: [],
}

function loadState() {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STATE
    const parsed = JSON.parse(raw)
    return {
      departmentRequests: Array.isArray(parsed.departmentRequests) ? parsed.departmentRequests : DEFAULT_STATE.departmentRequests,
      attendanceRecords: Array.isArray(parsed.attendanceRecords) ? parsed.attendanceRecords : DEFAULT_STATE.attendanceRecords,
      payments: Array.isArray(parsed.payments) ? parsed.payments : DEFAULT_STATE.payments,
    }
  } catch {
    return DEFAULT_STATE
  }
}

function periodKey(dateValue) {
  const date = new Date(dateValue)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function periodLabel(dateValue) {
  const date = new Date(dateValue)
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function payrollCycleKey(dateValue) {
  const date = new Date(dateValue)
  const cycle = date.getDate() <= 15 ? '1' : '2'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${cycle}`
}

function payrollCycleLabel(dateValue) {
  const date = new Date(dateValue)
  const day = date.getDate() <= 15 ? '1-15' : '16-end'
  return `${date.toLocaleString('en-US', { month: 'long', year: 'numeric' })} • ${day}`
}

function formatDateTime(dateValue) {
  return new Date(dateValue).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function getAssignedLeadmanDepartments(user) {
  if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
  if (user?.department) return [user.department]
  return [DEPARTMENTS[0]]
}

export function QRProvider({ children }) {
  const { user } = useAuth()
  const initialState = loadState()
  const [departmentRequests, setDepartmentRequests] = useState(initialState.departmentRequests)
  const [attendanceRecords, setAttendanceRecords] = useState(initialState.attendanceRecords)
  const [dailyReportDrafts, setDailyReportDrafts] = useState({})
  const [payments, setPayments] = useState(initialState.payments || [])
  const [leaveRequests, setLeaveRequests] = useState(initialState.leaveRequests || [])
  const [syncPending, setSyncPending] = useState(0)
  const [employees, setEmployees] = useState([])
  const [dailyReports, setDailyReports] = useState([])
  const [productionRecords, setProductionRecords] = useState([])
  const [payrollCycles, setPayrollCycles] = useState([])
  const [selectedLeadmanDepartment, setSelectedLeadmanDepartment] = useState('')

  // device id for offline records
  useEffect(() => {
    if (typeof window === 'undefined') return
    let did = window.localStorage.getItem('tagum_device_id')
    if (!did) {
      did = `DEV-${Math.random().toString(36).slice(2, 9)}`
      window.localStorage.setItem('tagum_device_id', did)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false

    async function loadRemoteData() {
      const payrollRoles = new Set(['finance', 'hr', 'production_incharge', 'admin'])
      const paymentRoles = new Set(['finance', 'hr', 'admin'])
      const employeeRoles = new Set(['finance', 'hr', 'production_incharge', 'leadman', 'admin'])
      const loadPayrollCycles = payrollRoles.has(user?.role)
      const loadPayrollPayments = paymentRoles.has(user?.role)
      const loadEmployees = employeeRoles.has(user?.role)
      const loadReports = payrollRoles.has(user?.role)

      const [remoteEmployees, remoteDepartmentRequests, remotePayments, remoteProduction, remotePayrollCycles, remoteDailyReports, remoteLeaveRequests] = await Promise.allSettled([
        loadEmployees ? fetchEmployeesApi() : Promise.resolve([]),
        fetchDepartmentRequestsApi(),
        loadPayrollPayments ? fetchPayrollPaymentsApi() : Promise.resolve([]),
        fetchProductionApi(),
        loadPayrollCycles ? fetchPayrollCyclesApi() : Promise.resolve([]),
        loadReports ? fetchDailyReportsApi() : Promise.resolve([]),
        fetchLeaveRequestsApi(),
      ])

      if (cancelled) return

      if (remoteEmployees.status === 'fulfilled') {
        setEmployees(mergeEmployees(Array.isArray(remoteEmployees.value) ? remoteEmployees.value : []))
      }

      if (remoteDepartmentRequests.status === 'fulfilled' && Array.isArray(remoteDepartmentRequests.value)) {
        setDepartmentRequests(remoteDepartmentRequests.value)
      }

      if (remotePayments.status === 'fulfilled' && Array.isArray(remotePayments.value) && remotePayments.value.length > 0) {
        setPayments(remotePayments.value)
      }
      if (remotePayrollCycles.status === 'fulfilled' && Array.isArray(remotePayrollCycles.value) && remotePayrollCycles.value.length > 0) {
        setPayrollCycles(remotePayrollCycles.value)
      }

      if (remoteProduction.status === 'fulfilled' && Array.isArray(remoteProduction.value) && remoteProduction.value.length > 0) {
        setProductionRecords(remoteProduction.value)
      }

      if (remoteDailyReports.status === 'fulfilled' && Array.isArray(remoteDailyReports.value)) {
        setDailyReports(remoteDailyReports.value)
      }

      if (remoteLeaveRequests.status === 'fulfilled' && Array.isArray(remoteLeaveRequests.value)) {
        setLeaveRequests(remoteLeaveRequests.value)
      }

      // Keep the existing state when a fetch fails so live request data does not disappear
      // behind the demo defaults during a partial backend outage or auth hiccup.
    }

    loadRemoteData()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.role !== 'leadman') {
      setSelectedLeadmanDepartment('')
      return
    }

    const allowedDepartments = getAssignedLeadmanDepartments(user)
    const storageKey = `${LEADMAN_DEPARTMENT_KEY_PREFIX}${user.id}`
    const savedDepartment = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : ''
    const nextDepartment = allowedDepartments.includes(savedDepartment) ? savedDepartment : allowedDepartments[0]
    setSelectedLeadmanDepartment(nextDepartment)
  }, [user?.id, user?.role, user?.department, user?.departments])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user?.role !== 'leadman') return
    if (!selectedLeadmanDepartment) return
    window.localStorage.setItem(`${LEADMAN_DEPARTMENT_KEY_PREFIX}${user.id}`, selectedLeadmanDepartment)
  }, [selectedLeadmanDepartment, user?.id, user?.role])

  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false
    let interval
    let consecutiveFailures = 0

    async function refreshDepartmentRequests() {
      try {
        const remoteDepartmentRequests = await fetchDepartmentRequestsApi()
        if (!cancelled && Array.isArray(remoteDepartmentRequests)) {
          setDepartmentRequests(remoteDepartmentRequests)
        }
        consecutiveFailures = 0
      } catch (error) {
        const status = Number(error?.status || 0)
        const message = String(error?.message || '').toLowerCase()
        consecutiveFailures += 1

        // Stop polling on auth failure to avoid noisy request loops.
        if (status === 401 || message.includes('could not validate credentials') || message.includes('unauthorized')) {
          cancelled = true
          if (interval) clearInterval(interval)
          return
        }

        // Stop polling after repeated network/CORS failures.
        if (error?.code === 'NETWORK_ERROR' || message.includes('cors') || message.includes('failed to fetch')) {
          if (consecutiveFailures >= 3) {
            cancelled = true
            if (interval) clearInterval(interval)
          }
        }
      }
    }

    refreshDepartmentRequests()
    interval = setInterval(refreshDepartmentRequests, 5000)
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false
    let interval

    async function refreshLeaveRequests() {
      try {
        const remote = await fetchLeaveRequestsApi()
        if (!cancelled && Array.isArray(remote)) setLeaveRequests(remote)
      } catch (error) {
        // ignore transient failures
      }
    }

    refreshLeaveRequests()
    interval = setInterval(refreshLeaveRequests, 5000)
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [user?.id])

  async function refreshPendingCount() {
    try {
      const c = await pendingCount()
      setSyncPending(c)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refreshPendingCount()
    function onlineHandler() {
      // try to sync when back online
      trySyncOnce().then(() => refreshPendingCount())
    }
    window.addEventListener('online', onlineHandler)
    const interval = setInterval(() => trySyncOnce().then(() => refreshPendingCount()), 1000 * 60)
    return () => {
      window.removeEventListener('online', onlineHandler)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ departmentRequests, attendanceRecords, payments, leaveRequests }))
  }, [departmentRequests, attendanceRecords, payments, leaveRequests])

  async function submitDepartmentRequest(record) {
    const tempId = `REQ-${Date.now()}`
    const payload = {
      id: tempId,
      ...record,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    setDepartmentRequests((current) => [payload, ...current])
    try {
      const created = await createDepartmentRequestApi({
        employeeId: payload.employeeId,
        employeeName: payload.employeeName,
        requestedDepartment: payload.requestedDepartment,
      })

      setDepartmentRequests((current) => {
        const updated = current.map((request) => {
          if (request.id === tempId) {
            return { ...created, status: 'pending' }
          }
          return request
        })

        if (!updated.some((request) => request.id === created.id)) {
          return [created, ...updated.filter((request) => request.id !== tempId)]
        }

        return updated
      })
      return created.id
    } catch (error) {
      setDepartmentRequests((current) => current.filter((request) => request.id !== tempId))
      throw error
    }
  }

  async function approveDepartmentRequest(id, leadmanId) {
    try {
      const approvedRequest = await approveDepartmentRequestApi(id, leadmanId)
      setDepartmentRequests((current) => current.map((request) => (
        request.id === id
          ? { ...request, ...approvedRequest, status: 'approved', leadmanId, leadmanAt: approvedRequest.leadmanAt || new Date().toISOString() }
          : request
      )))
      setEmployees((currentEmployees) => currentEmployees.map((employee) => (
        employee.employeeId === approvedRequest.employeeId
          ? { ...employee, department: approvedRequest.requestedDepartment }
          : employee
      )))
      return approvedRequest
    } catch (error) {
      throw error
    }
  }

  async function redirectDepartmentRequest(id, targetDepartment, leadmanId, note) {
    try {
      const redirectedRequest = await redirectDepartmentRequestApi(
        id,
        {
          targetDepartment,
          note,
        },
        leadmanId
      )
      setDepartmentRequests((current) => {
        const updatedSource = current.map((request) => (
          request.id === id
            ? { ...request, status: 'redirected', leadmanId, leadmanAt: redirectedRequest.leadmanAt || new Date().toISOString(), note: redirectedRequest.note || note || `Redirected to ${targetDepartment} by leadman.` }
            : request
        ))
        return [{ ...redirectedRequest, status: 'pending' }, ...updatedSource]
      })
      return redirectedRequest
    } catch (error) {
      throw error
    }
  }

  function recordAttendanceScan(record) {
    const departmentRate = DEPARTMENT_RATES[record.department || record.dept || record.raw?.department] ?? 70
    const rawEmployeeId = record.employeeId ?? record.id ?? record.employee_id ?? record.identifier ?? record.raw?.employeeId ?? record.raw?.employee_id ?? ''
    let employeeId = Number(rawEmployeeId)
    if (Number.isNaN(employeeId)) employeeId = undefined
    const employeeName = String(record.employeeName || record.name || record.employee_name || record.fullName || record.raw?.employeeName || record.raw?.employee_name || '').trim()
    const department = String(record.department || record.dept || record.raw?.department || '').trim()
    const id = `ATD-${Date.now()}`
    const scannedAt = record.scanCapturedAt || record.scannedAt || new Date().toISOString()
    const qrFields = record.qrFields || {}
    const batchId = String(record.batchId || record.raw?.batchId || id)
    const batchCapturedAt = record.batchCapturedAt || record.raw?.batchCapturedAt || scannedAt
    const batchEmployeeCount = Number(record.batchEmployeeCount || record.raw?.batchEmployeeCount || 1)
    const notes = record.notes || buildDepartmentQrSummary(department, qrFields) || null
    const raw = record.raw || {
      department,
      employeeId,
      employeeName,
      loggedHours: Number(record.loggedHours || 0),
      qrFields,
      qrSummary: record.qrSummary || notes,
      capturedAt: scannedAt,
      batchId,
      batchCapturedAt,
      batchEmployeeCount,
    }
    const payload = {
      id,
      ...record,
      employeeId,
      employeeName,
      department,
      scannedAt,
      batchId,
      batchCapturedAt,
      batchEmployeeCount,
      status: 'leadman_verified',
      leadmanVerifiedAt: new Date().toISOString(),
      rate: record.rate ?? departmentRate,
      amount: Number(record.loggedHours || 0) * Number(record.rate ?? departmentRate),
      raw,
      notes,
    }

    let foundDuplicate = null
    setAttendanceRecords((current) => {
      const duplicate = current.find((existing) => (
        existing.employeeId === payload.employeeId
        && existing.department === payload.department
        && existing.scannedAt === payload.scannedAt
        && existing.loggedHours === payload.loggedHours
        && existing.amount === payload.amount
        && existing.notes === payload.notes
      ))
      if (duplicate) {
        foundDuplicate = duplicate
        return current
      }
      return [payload, ...current]
    })

    if (foundDuplicate) {
      return foundDuplicate.id
    }
    // add to daily report draft for the department
    try {
      setDailyReportDrafts((cur) => {
        const key = `${payload.department}:${new Date(payload.scannedAt).toISOString().slice(0, 10)}`
        const draft = cur[key] || { department: payload.department, reportDate: new Date(payload.scannedAt).toISOString().slice(0, 10), entries: [], summary: '', totalHours: 0, totalAmount: 0 }
        const entry = {
          id: payload.id,
          batchId: payload.batchId,
          batchCapturedAt: payload.batchCapturedAt,
          batchEmployeeCount: payload.batchEmployeeCount,
          employeeId: payload.employeeId,
          employeeName: payload.employeeName,
          scannedAt: payload.scannedAt,
          loggedHours: payload.loggedHours,
          rate: payload.rate,
          amount: payload.amount,
          raw: payload.raw,
          notes: payload.notes,
        }
        draft.entries = [entry, ...draft.entries]
        draft.totalHours = (draft.totalHours || 0) + Number(entry.loggedHours || 0)
        draft.totalAmount = (draft.totalAmount || 0) + Number(entry.amount || 0)
        return { ...cur, [key]: draft }
      })
    } catch (e) { /* ignore in non-browser env */ }
    // enqueue for offline sync
    // Attendance backend is intentionally not used in this workflow anymore.
    // Keep the local draft/report flow only.
    return id
  }

  function approveAttendanceByHead(id, headId) {
    setAttendanceRecords((current) => current.map((record) => (
      record.id === id
        ? { ...record, status: 'head_verified', headId, headVerifiedAt: new Date().toISOString() }
        : record
    )))
    headVerifyAttendanceApi(id, headId).catch(() => {})
  }

  function submitScan(record) {
    const id = recordAttendanceScan(record)
    // try immediate sync if online
    try {
      trySyncOnce().then(() => refreshPendingCount())
    } catch {}
    return id
  }

  function approveByLeadman(id, leadmanId) {
    approveDepartmentRequest(id, leadmanId)
    leadmanVerifyAttendanceApi(id, leadmanId).catch(() => {})
  }

  function approveByHead(id, headId) {
    approveAttendanceByHead(id, headId)
  }

  function clearAll() {
    setDepartmentRequests([])
    setAttendanceRecords([])
    setPayments([])
    setLeaveRequests([])
  }

  function getEmployeeDepartment(employeeId) {
    const approvedRequests = departmentRequests
      .filter((request) => request.employeeId === employeeId && request.status === 'approved')
      .sort((a, b) => new Date(b.leadmanAt || b.requestedAt) - new Date(a.leadmanAt || a.requestedAt))

    if (approvedRequests.length > 0) {
      return approvedRequests[0].requestedDepartment
    }

    const employee = employees.find((item) => String(item.employeeId) === String(employeeId))
    return employee?.department || null
  }

  function getEmployeeDepartmentRequests(employeeId) {
    return departmentRequests.filter((request) => request.employeeId === employeeId)
  }

  function getEmployeeLeaveRequests(employeeId) {
    return leaveRequests.filter((r) => r.employeeId === employeeId)
  }

  async function approveLeaveRequest(id, approverId, note) {
    try {
      const approved = await approveLeaveRequestApi(id, approverId, { note })
      setLeaveRequests((current) => current.map((r) => (r.id === id ? { ...r, ...approved, status: 'approved', approvedBy: approved.approvedBy || approverId, approvedAt: approved.approvedAt || new Date().toISOString() } : r)))
      return approved
    } catch (error) {
      throw error
    }
  }

  // Reject a leave request via API, with optimistic UI update and rollback on error.
  async function rejectLeaveRequest(id, approverId, note) {
    const prev = leaveRequests.slice()
    const optimistic = {
      id,
      status: 'rejected',
      approvedBy: approverId || null,
      approvedAt: new Date().toISOString(),
      note: note || null,
    }
    setLeaveRequests((current) => current.map((r) => (r.id === id ? { ...r, ...optimistic } : r)))
    try {
      const rejected = await rejectLeaveRequestApi(id, approverId, { note })
      setLeaveRequests((current) => current.map((r) => (r.id === id ? { ...r, ...rejected, status: rejected.status || 'rejected' } : r)))
      return rejected
    } catch (error) {
      // rollback optimistic update
      setLeaveRequests(prev)
      throw error
    }
  }

  async function submitLeaveRequest(record) {
    const tempId = `LEAVE-${Date.now()}`
    const payload = {
      id: tempId,
      ...record,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    setLeaveRequests((cur) => [payload, ...cur])
    try {
      const created = await submitLeaveRequestApi({
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        leaveType: record.leaveType,
        reason: record.reason,
      })
      setLeaveRequests((cur) => cur.map((r) => (r.id === tempId ? { ...created } : r)))
      return created.id
    } catch (error) {
      // keep local copy and rethrow so UI can show error
      throw error
    }
  }

  function getLeadmanDepartmentRequests(department) {
    return departmentRequests.filter((request) => request.status === 'pending' && request.requestedDepartment === department)
  }

  function resolveEmployeeRecord(employeeId, employeeName) {
    const byId = employees.find((employee) => String(employee.employeeId) === String(employeeId))
    if (byId) return byId

    const byName = employees.find((employee) => String(employee.employeeName || '').toLowerCase() === String(employeeName || '').toLowerCase())
    if (byName) return byName

    return null
  }

  function flattenDailyReportEntries(reports = dailyReports) {
    return (Array.isArray(reports) ? reports : []).flatMap((report) => {
      const entries = Array.isArray(report.entries) ? report.entries : []
      const reportDate = report.reportDate || report.report_date || report.createdAt || report.created_at || new Date().toISOString()
      const createdAt = report.createdAt || report.created_at || reportDate

      return entries.map((entry, index) => {
        const resolvedEmployee = resolveEmployeeRecord(entry.employeeId, entry.employeeName)
        const employeeId = entry.employeeId ?? resolvedEmployee?.employeeId ?? null
        const employeeName = entry.employeeName || resolvedEmployee?.employeeName || 'Unknown'
        const department = entry.department || resolvedEmployee?.department || report.department || 'Unknown'
        const loggedHours = Number(entry.loggedHours || 0)
        const amount = Number(entry.amount || 0)

        return {
          id: entry.id || `${report.id}-${index}`,
          employeeId,
          employeeName,
          department,
          loggedHours,
          scannedAt: createdAt,
          reportDate,
          reportId: report.id,
          summary: report.summary || '',
          rate: loggedHours > 0 ? amount / loggedHours : Number(entry.rate || 0),
          amount,
          notes: entry.notes || report.summary || '',
          raw: entry.raw || entry,
          status: 'submitted',
        }
      })
    })
  }

  function getEmployeeAttendance(employeeId) {
    return attendanceRecords.filter((record) => record.employeeId === employeeId)
  }

  function getLeadmanAttendance(department) {
    return attendanceRecords.filter((record) => record.department === department && record.status !== 'head_verified')
  }

  function getHeadPendingAttendance() {
    return attendanceRecords.filter((record) => record.status === 'leadman_verified')
  }

  function getFinanceAttendance() {
    return flattenDailyReportEntries()
  }

  function getFinanceRecords() {
    return getFinanceAttendance().slice().sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
  }

  function getFinanceEmployees() {
    const records = getFinanceAttendance()
    const aggregate = new Map()

    employees.forEach((employee) => {
      aggregate.set(String(employee.employeeId), {
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.department || null,
        logs: 0,
        totalHours: 0,
        totalAmount: 0,
      })
    })

    records.forEach((record) => {
      const key = String(record.employeeId || record.employeeName)
      const current = aggregate.get(key) || {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department || null,
        logs: 0,
        totalHours: 0,
        totalAmount: 0,
      }
      current.logs += 1
      current.totalHours += Number(record.loggedHours || 0)
      current.totalAmount += Number(record.amount || 0)
      if (!current.department && record.department) current.department = record.department
      aggregate.set(key, current)
    })

    return Array.from(aggregate.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName))
  }

  function getFinanceEmployeeHistory(employeeId) {
    return getFinanceRecords().filter((record) => String(record.employeeId) === String(employeeId))
  }

  function getDailyReportDraft(department, reportDate) {
    const key = `${department}:${new Date(reportDate).toISOString().slice(0, 10)}`
    const draft = dailyReportDrafts[key]

    if (!draft) {
      return {
        department,
        reportDate: new Date(reportDate).toISOString().slice(0, 10),
        entries: [],
        summary: '',
        totalHours: 0,
        totalAmount: 0,
      }
    }

    return {
      department: draft.department || department,
      reportDate: draft.reportDate || new Date(reportDate).toISOString().slice(0, 10),
      entries: Array.isArray(draft.entries) ? draft.entries : [],
      summary: draft.summary || '',
      totalHours: Number(draft.totalHours || 0),
      totalAmount: Number(draft.totalAmount || 0),
    }
  }

  function removeDailyReportBatch(department, reportDate, batchId) {
    const key = `${department}:${new Date(reportDate).toISOString().slice(0, 10)}`
    setDailyReportDrafts((current) => {
      const draft = current[key]
      if (!draft) return current

      const remainingEntries = (Array.isArray(draft.entries) ? draft.entries : []).filter((entry) => String(entry.batchId || entry.raw?.batchId || entry.id) !== String(batchId))
      const next = { ...current }

      if (remainingEntries.length === 0) {
        delete next[key]
        return next
      }

      next[key] = {
        ...draft,
        entries: remainingEntries,
        totalHours: remainingEntries.reduce((sum, entry) => sum + Number(entry.loggedHours || 0), 0),
        totalAmount: remainingEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      }
      return next
    })
  }

  function getFinancePayrollCycles() {
    // Prefer server-side cycles when available
    if (Array.isArray(payrollCycles) && payrollCycles.length > 0) return payrollCycles

    const grouped = getFinanceAttendance().reduce((accumulator, record) => {
      const key = payrollCycleKey(record.scannedAt || record.reportDate || new Date().toISOString())
      if (!accumulator[key]) {
        accumulator[key] = {
          key,
          label: payrollCycleLabel(record.scannedAt || record.reportDate || new Date().toISOString()),
          records: [],
        }
      }
      accumulator[key].records.push(record)
      return accumulator
    }, {})

    return Object.values(grouped)
      .map((cycle) => ({
        ...cycle,
        totalHours: cycle.records.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0),
        totalAmount: cycle.records.reduce((sum, record) => sum + Number(record.amount || 0), 0),
        employeeCount: new Set(cycle.records.map((record) => record.employeeId)).size,
        latestDate: cycle.records[0]?.scannedAt,
      }))
      .sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0))
  }

  function getFinancePayrollCycle(key) {
    const records = getFinanceAttendance().filter((record) => payrollCycleKey(record.scannedAt || record.reportDate || new Date().toISOString()) === key)
    return {
      key,
      records: records.slice().sort((a, b) => new Date(b.scannedAt || b.reportDate || 0) - new Date(a.scannedAt || a.reportDate || 0)),
      totalHours: records.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0),
      totalAmount: records.reduce((sum, record) => sum + Number(record.amount || 0), 0),
      employeeCount: new Set(records.map((record) => String(record.employeeId || record.employeeName || ''))).size,
    }
  }

  function getPayslipPeriods(employeeId) {
    const records = getFinanceRecords().filter((record) => String(record.employeeId) === String(employeeId))
    const grouped = records.reduce((accumulator, record) => {
      const key = payrollCycleKey(record.scannedAt || record.reportDate || new Date().toISOString())
      if (!accumulator[key]) {
        accumulator[key] = { key, label: payrollCycleLabel(record.scannedAt || record.reportDate || new Date().toISOString()), records: [] }
      }
      accumulator[key].records.push(record)
      return accumulator
    }, {})

    return Object.values(grouped)
      .map((period) => {
        const totalHours = period.records.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0)
        const totalAmount = period.records.reduce((sum, record) => sum + Number(record.amount || 0), 0)
        return {
          ...period,
          totalHours,
          totalAmount,
          recordCount: period.records.length,
          latestDate: period.records[0]?.scannedAt,
        }
      })
      .sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0))
  }

  function markPayslipReleased(employeeId, periodCycleKey, financeId) {
    const period = getPayslipPeriod(employeeId, periodCycleKey)
    const amount = period.totalAmount || 0
    const id = `PAY-${Date.now()}`
    const payload = {
      id,
      employeeId,
      period: periodCycleKey,
      amount,
      releasedAt: new Date().toISOString(),
      releasedBy: financeId,
    }
    setPayments((cur) => [payload, ...cur])
    releasePayrollApi({
      employeeId,
      periodKey: periodCycleKey,
      periodLabel: payrollCycleLabel(new Date()),
      amount,
      releasedAt: new Date().toISOString(),
      releasedBy: financeId,
    }).catch(() => {})
    return id
  }

  function isPayslipReleased(employeeId, periodCycleKey) {
    return payments.some((p) => p.employeeId === employeeId && p.period === periodCycleKey)
  }

  function getEmployeePayments(employeeId) {
    return payments.filter((p) => p.employeeId === employeeId)
  }

  function getFinancePayments() {
    return payments.slice().sort((a, b) => new Date(b.releasedAt) - new Date(a.releasedAt))
  }

  async function submitDailyReport(department, reportDate, submittedBy, submittedByName, summary = '', entries = null) {
    const key = `${department}:${new Date(reportDate).toISOString().slice(0, 10)}`
    const draft = dailyReportDrafts[key]
    const resolvedEntries = Array.isArray(entries) ? entries : (draft?.entries || [])
    if (!draft && resolvedEntries.length === 0) throw new Error('No draft for selected department/date')
    const payload = {
      department: draft?.department || department,
      reportDate: draft?.reportDate || new Date(reportDate).toISOString().slice(0, 10),
      submittedBy,
      submittedByName,
      status: 'submitted',
      summary,
      entries: resolvedEntries,
    }
    try {
      const result = await submitDailyReportApi(payload)
      setDailyReportDrafts((cur) => {
        const next = { ...cur }
        const existingDraft = next[key]
        if (!existingDraft) return next

        const currentEntries = Array.isArray(existingDraft.entries) ? existingDraft.entries : []
        const submittedIds = new Set(resolvedEntries.map((entry) => String(entry.batchId || entry.raw?.batchId || entry.id)))
        const remainingEntries = currentEntries.filter((entry) => !submittedIds.has(String(entry.batchId || entry.raw?.batchId || entry.id)))

        if (remainingEntries.length === 0 || resolvedEntries.length >= currentEntries.length) {
          delete next[key]
          return next
        }

        next[key] = {
          ...existingDraft,
          entries: remainingEntries,
          totalHours: remainingEntries.reduce((sum, entry) => sum + Number(entry.loggedHours || 0), 0),
          totalAmount: remainingEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        }
        return next
      })
      return result
    } catch (e) {
      throw e
    }
  }

  function getPayslipPeriod(employeeId, period) {
    const records = getFinanceRecords().filter((record) => String(record.employeeId) === String(employeeId) && payrollCycleKey(record.scannedAt || record.reportDate || new Date().toISOString()) === period)
    return {
      records,
      totalHours: records.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0),
      totalAmount: records.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    }
  }

  function getEmployeeTotals(employeeId) {
    const records = getFinanceRecords().filter((record) => String(record.employeeId) === String(employeeId))
    const totalHours = records.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0)
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount || 0), 0)
    const latestRecord = records[0] || null
    return {
      totalHours,
      totalAmount,
      latestRecord,
      currentDepartment: getEmployeeDepartment(employeeId),
      records,
    }
  }

  return (
    <QRContext.Provider
      value={{
        departmentRequests,
        attendanceRecords,
        leaveRequests,
        submitDepartmentRequest,
        approveDepartmentRequest,
        submitLeaveRequest,
        approveLeaveRequest,
        recordAttendanceScan,
        approveAttendanceByHead,
        submitScan,
        approveByLeadman,
        approveByHead,
        clearAll,
        getEmployeeDepartment,
        getEmployeeDepartmentRequests,
        getEmployeeLeaveRequests,
        getLeadmanDepartmentRequests,
        getEmployeeAttendance,
        getLeadmanAttendance,
        getHeadPendingAttendance,
        getFinanceAttendance,
        getFinanceRecords,
        getFinanceEmployees,
        getFinanceEmployeeHistory,
        getDailyReportDraft,
        removeDailyReportBatch,
        getFinancePayrollCycles,
        getFinancePayrollCycle,
        getPayslipPeriods,
        getPayslipPeriod,
        getEmployeeTotals,
        payments,
        markPayslipReleased,
        isPayslipReleased,
        getEmployeePayments,
        getFinancePayments,
        syncPending,
        syncNow: async () => { const r = await trySyncOnce(); await refreshPendingCount(); return r },
        formatDateTime,
        periodLabel,
        periodKey,
        payrollCycleKey,
        payrollCycleLabel,
        DEPARTMENTS,
        DEPARTMENT_RATES,
        buildDepartmentQrSummary,
        employees,
        productionRecords,
        dailyReportDrafts,
        submitDailyReport,
        rejectLeaveRequest,
        selectedLeadmanDepartment,
        setSelectedLeadmanDepartment,
        redirectDepartmentRequest,
      }}
    >
      {children}
    </QRContext.Provider>
  )
}

export default QRProvider
