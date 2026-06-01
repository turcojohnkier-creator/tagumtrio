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
  fetchAnnouncementsApi,
  createAnnouncementApi,
  updateAnnouncementApi,
  deleteAnnouncementApi,
  fetchSchedulesApi,
  createScheduleApi,
  updateScheduleApi,
  deleteScheduleApi,
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

function normalizeKeyValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function dedupeBy(items = [], keyFn, sortFn = null) {
  const list = Array.isArray(items) ? items.slice() : []
  if (typeof sortFn === 'function') {
    list.sort(sortFn)
  }

  const seen = new Set()
  const result = []

  for (const item of list) {
    const key = keyFn(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

function mergeEmployees(remoteEmployees = []) {
  if (Array.isArray(remoteEmployees) && remoteEmployees.length > 0) {
    const normalized = remoteEmployees.map(toEmployeeRecord).filter((employee) => employee.employeeId)
    return dedupeBy(
      normalized,
      (employee) => normalizeKeyValue(employee.employeeId),
      (left, right) => Number(right.employeeId || 0) - Number(left.employeeId || 0)
    )
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
  announcements: [],
  schedules: [],
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
      leaveRequests: Array.isArray(parsed.leaveRequests) ? parsed.leaveRequests : DEFAULT_STATE.leaveRequests,
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : DEFAULT_STATE.announcements,
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : DEFAULT_STATE.schedules,
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
  if (Array.isArray(user?.departments) && user.departments.length > 0) {
    return user.departments.filter((department) => DEPARTMENTS.includes(department))
  }
  if (user?.department && DEPARTMENTS.includes(user.department)) return [user.department]
  return []
}

export function QRProvider({ children }) {
  const { user } = useAuth()
  const initialState = loadState()
  const [departmentRequests, setDepartmentRequests] = useState(initialState.departmentRequests)
  const [attendanceRecords, setAttendanceRecords] = useState(initialState.attendanceRecords)
  const [dailyReportDrafts, setDailyReportDrafts] = useState({})
  const [payments, setPayments] = useState(initialState.payments || [])
  const [announcements, setAnnouncements] = useState(initialState.announcements || [])
  const [schedules, setSchedules] = useState(initialState.schedules || [])
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

      try {
        const [remoteAnnouncements2, remoteSchedules2] = await Promise.allSettled([fetchAnnouncementsApi(), fetchSchedulesApi()])
        if (remoteAnnouncements2.status === 'fulfilled' && Array.isArray(remoteAnnouncements2.value)) setAnnouncements(remoteAnnouncements2.value)
        if (remoteSchedules2.status === 'fulfilled' && Array.isArray(remoteSchedules2.value)) setSchedules(remoteSchedules2.value)
      } catch (e) { /* ignore */ }

      // Keep the existing state when a fetch fails so live request data does not disappear
      // behind the demo defaults during a partial backend outage or auth hiccup.
    }

    loadRemoteData()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  // Poll announcements and schedules for updates every 10s
  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false
    let interval

    async function refreshAnnouncementsAndSchedules() {
      try {
        const [annResp, schResp] = await Promise.allSettled([fetchAnnouncementsApi(), fetchSchedulesApi()])
        if (!cancelled) {
          if (annResp.status === 'fulfilled' && Array.isArray(annResp.value)) setAnnouncements(annResp.value)
          if (schResp.status === 'fulfilled' && Array.isArray(schResp.value)) setSchedules(schResp.value)
        }
      } catch (e) { /* ignore */ }
    }

    refreshAnnouncementsAndSchedules()
    interval = setInterval(refreshAnnouncementsAndSchedules, 10000)
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.role !== 'leadman') {
      setSelectedLeadmanDepartment('')
      return
    }

    const allowedDepartments = getAssignedLeadmanDepartments(user)
    if (allowedDepartments.length === 0) {
      setSelectedLeadmanDepartment('')
      return
    }
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ departmentRequests, attendanceRecords, payments, leaveRequests, announcements, schedules }))
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
    return dedupeBy(
      departmentRequests.filter((request) => String(request.employeeId) === String(employeeId)),
      (request) => String(request.id || `${request.employeeId}-${request.requestedDepartment}-${request.status}-${request.requestedAt}`),
      (left, right) => new Date(right.requestedAt || right.createdAt || 0) - new Date(left.requestedAt || left.createdAt || 0)
    )
  }

  function getEmployeeLeaveRequests(employeeId) {
    return dedupeBy(
      leaveRequests.filter((request) => String(request.employeeId) === String(employeeId)),
      (request) => String(request.id || `${request.employeeId}-${request.leaveType}-${request.requestedAt}`),
      (left, right) => new Date(right.requestedAt || right.createdAt || 0) - new Date(left.requestedAt || left.createdAt || 0)
    )
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

  // Announcements management
  async function createAnnouncement(record) {
    const tempId = `ANN-${Date.now()}`
    const payload = { id: tempId, ...record, audience: record.audience || 'All employees', visibility: record.visibility || 'all_employees', createdAt: new Date().toISOString() }
    setAnnouncements((cur) => [payload, ...cur])
    try {
      const created = await createAnnouncementApi({ title: record.title, body: record.body, pinned: record.pinned, audience: payload.audience, visibility: payload.visibility })
      setAnnouncements((cur) => cur.map((a) => (a.id === tempId ? created : a)))
      return created
    } catch (e) {
      setAnnouncements((cur) => cur.filter((a) => a.id !== tempId))
      throw e
    }
  }

  async function removeAnnouncement(id) {
    const prev = announcements.slice()
    setAnnouncements((cur) => cur.filter((a) => a.id !== id))
    try {
      await deleteAnnouncementApi(id)
    } catch (e) {
      setAnnouncements(prev)
      throw e
    }
  }

  async function updateAnnouncement(id, updates) {
    const prev = announcements.slice()
    setAnnouncements((cur) => cur.map((a) => (a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a)))
    try {
      const updated = await updateAnnouncementApi(id, updates)
      setAnnouncements((cur) => cur.map((a) => (a.id === id ? updated : a)))
      return updated
    } catch (e) {
      setAnnouncements(prev)
      throw e
    }
  }

  // Schedules management
  async function createSchedule(record) {
    const tempId = `SCH-${Date.now()}`
    const payload = { id: tempId, ...record }
    setSchedules((cur) => [payload, ...cur])
    try {
      const created = await createScheduleApi(record)
      setSchedules((cur) => cur.map((s) => (s.id === tempId ? created : s)))
      return created
    } catch (e) {
      setSchedules((cur) => cur.filter((s) => s.id !== tempId))
      throw e
    }
  }

  async function updateSchedule(id, updates) {
    try {
      const updated = await updateScheduleApi(id, updates)
      setSchedules((cur) => cur.map((s) => (s.id === id ? { ...s, ...updated } : s)))
      return updated
    } catch (e) {
      throw e
    }
  }

  async function removeSchedule(id) {
    const prev = schedules.slice()
    setSchedules((cur) => cur.filter((s) => s.id !== id))
    try {
      await deleteScheduleApi(id)
    } catch (e) {
      setSchedules(prev)
      throw e
    }
  }

  function getEmployeeSchedules(employeeId) {
    return (schedules || []).filter((s) => String(s.employeeId) === String(employeeId) || s.department === getEmployeeDepartment(employeeId))
  }

  // Active reminders (client-side)
  const [activeReminders, setActiveReminders] = useState([])
  useEffect(() => {
    if (!user) return
    let interval
    function checkReminders() {
      const now = Date.now()
      const nextReminders = []
      for (const s of schedules || []) {
        const start = s.startAt ? new Date(s.startAt).getTime() : null
        if (start && start - now <= 1000 * 60 * 30 && start - now >= -1000 * 60 * 5) {
          nextReminders.push({ type: 'shift', schedule: s })
        }
      }
      for (const a of announcements || []) {
        if (a.pinned) nextReminders.push({ type: 'announcement', announcement: a })
      }
      setActiveReminders(nextReminders)
    }
    checkReminders()
    interval = setInterval(checkReminders, 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id, announcements, schedules])

  function getLeadmanDepartmentRequests(department) {
    return dedupeBy(
      departmentRequests.filter((request) => request.status === 'pending' && request.requestedDepartment === department),
      (request) => String(request.id || `${request.employeeId}-${request.requestedDepartment}-${request.status}`),
      (left, right) => new Date(right.requestedAt || right.createdAt || 0) - new Date(left.requestedAt || left.createdAt || 0)
    )
  }
  
  function getLeadmanDeployedEmployees(department) {
    const approvedRequests = departmentRequests.filter((request) => request.status === 'approved' && request.requestedDepartment === department)
    const latestByEmployee = new Map()

    approvedRequests.forEach((request) => {
      const key = String(request.employeeId || request.employeeName || request.id || '')
      if (!key) return

      const current = latestByEmployee.get(key)
      const currentDate = new Date(current?.leadmanAt || current?.requestedAt || 0).getTime()
      const nextDate = new Date(request.leadmanAt || request.requestedAt || 0).getTime()

      if (!current || nextDate >= currentDate) {
        latestByEmployee.set(key, request)
      }
    })

    return Array.from(latestByEmployee.values()).sort((left, right) => new Date(right.leadmanAt || right.requestedAt || 0) - new Date(left.leadmanAt || left.requestedAt || 0))
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
    return dedupeBy(
      attendanceRecords.filter((record) => String(record.employeeId) === String(employeeId)),
      (record) => String(record.id || `${record.employeeId}-${record.department}-${record.scannedAt}-${record.status}`),
      (left, right) => new Date(right.scannedAt || right.leadmanVerifiedAt || right.headVerifiedAt || 0) - new Date(left.scannedAt || left.leadmanVerifiedAt || left.headVerifiedAt || 0)
    )
  }

  function getLeadmanAttendance(department) {
    return dedupeBy(
      attendanceRecords.filter((record) => record.department === department && record.status !== 'head_verified'),
      (record) => String(record.id || `${record.employeeId}-${record.department}-${record.scannedAt}-${record.status}`),
      (left, right) => new Date(right.scannedAt || right.leadmanVerifiedAt || right.headVerifiedAt || 0) - new Date(left.scannedAt || left.leadmanVerifiedAt || left.headVerifiedAt || 0)
    )
  }

  function getHeadPendingAttendance() {
    return dedupeBy(
      attendanceRecords.filter((record) => record.status === 'leadman_verified'),
      (record) => String(record.id || `${record.employeeId}-${record.department}-${record.scannedAt}-${record.status}`),
      (left, right) => new Date(right.scannedAt || right.leadmanVerifiedAt || 0) - new Date(left.scannedAt || left.leadmanVerifiedAt || 0)
    )
  }

  function getFinanceAttendance() {
    return dedupeBy(
      flattenDailyReportEntries(),
      (record) => String(record.id || `${record.reportId || ''}-${record.employeeId || ''}-${record.department || ''}-${record.scannedAt || ''}`),
      (left, right) => new Date(right.scannedAt || right.reportDate || 0) - new Date(left.scannedAt || left.reportDate || 0)
    )
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
          getLeadmanDeployedEmployees,
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
        announcements,
        createAnnouncement,
        updateAnnouncement,
        removeAnnouncement,
        schedules,
        createSchedule,
        updateSchedule,
        removeSchedule,
        getEmployeeSchedules,
        activeReminders,
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
