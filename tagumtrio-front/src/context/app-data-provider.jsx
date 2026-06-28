import { useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { useDialog } from './dialog-context'
import { AppDataContext } from './app-data-context'
import { DEPARTMENTS } from '../constants/departments'
import { buildDepartmentReportSummary } from '../constants/department-report-fields'
import { toManilaDateKey } from '../lib/datetime'

// Local storage keys and defaults
const STORAGE_KEY = 'triops-app-data-state'
const LEADMAN_DEPARTMENT_KEY_PREFIX = 'triops-leadman-dept:'
import {
  fetchEmployeesApi,
  fetchDailyReportsApi,
  fetchPayrollPaymentsApi,
  fetchProductionApi,
  submitLeaveRequestApi,
  fetchLeaveRequestsApi,
  approveLeaveRequestApi,
  rejectLeaveRequestApi,
  submitDailyReportApi,
  updateDailyReportApi,
  resubmitDailyReportApi,
  approveDailyReportApi,
  fetchAnnouncementsApi,
  createAnnouncementApi,
  updateAnnouncementApi,
  deleteAnnouncementApi,
  fetchRatesApi,
  createRateApi,
  updateRateApi,
  deleteRateApi,
  fetchNotificationUnreadCountsApi,
  fetchNotificationsApi,
  markNotificationsReadByTypeApi,
  hasAuthToken,
} from '../lib/api'

function toEmployeeRecord(employee) {
  if (!employee) return {}
  const rawId = employee.employeeId ?? employee.id ?? employee.employee_id ?? employee.normalizedEmployeeId
  const parsed = Number(rawId)
  const employeeId = Number.isFinite(parsed) ? parsed : (rawId !== undefined && rawId !== null ? String(rawId) : undefined)
  return {
    ...employee,
    employeeId,
    employeeName: String(employee.employeeName || employee.name || employee.fullName || employee.employee_name || '').trim(),
    department: employee.department || employee.dept || employee.departmentName || '',
    role: employee.role || employee.position || employee.title || 'employee',
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

export function AppDataProvider({ children }) {
  const { user } = useAuth()
  const dialog = useDialog()
  const initialState = loadState()
  const [dailyReportDrafts, setDailyReportDrafts] = useState({})
  const [payments, setPayments] = useState(initialState.payments || [])
  const [announcements, setAnnouncements] = useState(initialState.announcements || [])
  const [rates, setRates] = useState([])
  const [notificationCounts, setNotificationCounts] = useState({})
  // schedules feature removed; keep empty state to avoid breaking callers
  const [schedules, setSchedules] = useState([])
  const [leaveRequests, setLeaveRequests] = useState(initialState.leaveRequests || [])
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [dailyReports, setDailyReports] = useState([])
  const [productionRecords, setProductionRecords] = useState([])
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
      const payrollRoles = new Set(['hr', 'production_incharge', 'admin'])
      const paymentRoles = new Set(['hr', 'admin'])
      const employeeRoles = new Set(['hr', 'production_incharge', 'leadman', 'admin', 'gm'])
      const loadPayrollPayments = paymentRoles.has(user?.role)
      const loadEmployees = employeeRoles.has(user?.role)
      const loadReports = payrollRoles.has(user?.role) || user?.role === 'leadman' || user?.role === 'employee'

      if (loadEmployees) setEmployeesLoading(true)
      const [remoteEmployees, remotePayments, remoteProduction, remoteDailyReports, remoteLeaveRequests] = await Promise.allSettled([
        loadEmployees ? fetchEmployeesApi() : Promise.resolve([]),
        loadPayrollPayments ? fetchPayrollPaymentsApi() : Promise.resolve([]),
        fetchProductionApi(),
        loadReports ? fetchDailyReportsApi() : Promise.resolve([]),
        fetchLeaveRequestsApi(),
      ])

      if (cancelled) return

      if (remoteEmployees.status === 'fulfilled') {
        setEmployees(mergeEmployees(Array.isArray(remoteEmployees.value) ? remoteEmployees.value : []))
      }

      if (remotePayments.status === 'fulfilled' && Array.isArray(remotePayments.value) && remotePayments.value.length > 0) {
        setPayments(remotePayments.value)
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
        const remoteAnnouncements2 = await fetchAnnouncementsApi().catch(() => [])
        if (Array.isArray(remoteAnnouncements2)) setAnnouncements(remoteAnnouncements2)
      } catch (e) { /* ignore */ }

      try {
        const remoteRates = await fetchRatesApi().catch(() => [])
        if (Array.isArray(remoteRates)) setRates(remoteRates)
      } catch (e) { /* ignore */ }
      if (!cancelled) setEmployeesLoading(false)

      // Keep the existing state when a fetch fails so live request data does not disappear
      // behind the demo defaults during a partial backend outage or auth hiccup.
    }

    loadRemoteData()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function refreshEmployees() {
    if (!user) return
    if (!hasAuthToken()) return
    setEmployeesLoading(true)
    try {
      const remote = await fetchEmployeesApi()
      if (Array.isArray(remote)) setEmployees(mergeEmployees(remote))
    } catch (e) {
      // ignore transient errors
    } finally {
      setEmployeesLoading(false)
    }
  }

  async function refreshDailyReports(params = {}) {
    if (!user) return []
    if (!hasAuthToken()) return []
    const remote = await fetchDailyReportsApi(params)
    if (Array.isArray(remote)) {
      setDailyReports(remote)
      return remote
    }
    return []
  }

  async function updateDailyReportStatus(reportId, updates) {
    if (!reportId) throw new Error('Missing report id')
    const previousReports = dailyReports.slice()
    const patch = {
      status: updates?.status,
      verifiedBy: updates?.verifiedBy,
      verifiedByName: updates?.verifiedByName,
      notes: updates?.notes,
    }

    setDailyReports((current) => current.map((report) => (
      String(report.id) === String(reportId)
        ? { ...report, status: patch.status || report.status, verifiedBy: patch.verifiedBy ?? report.verifiedBy, verifiedByName: patch.verifiedByName ?? report.verifiedByName, notes: patch.notes ?? report.notes, updatedAt: new Date().toISOString() }
        : report
    )))

    try {
      const updated = await updateDailyReportApi(reportId, patch)
      setDailyReports((current) => current.map((report) => (String(report.id) === String(reportId) ? updated : report)))
      return updated
    } catch (error) {
      setDailyReports(previousReports)
      throw error
    }
  }

  // Poll announcements and schedules for updates every 10s
  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false
    let interval

    async function refreshAnnouncements() {
      try {
        const annResp = await fetchAnnouncementsApi()
        if (!cancelled && Array.isArray(annResp)) setAnnouncements(annResp)
      } catch (e) { /* ignore */ }
    }

    refreshAnnouncements()
    interval = setInterval(refreshAnnouncements, 10000)
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

  // Poll unread notification counts (drives nav red dots) and pop up a blocking
  // dialog the moment a reassignment notification arrives, regardless of which
  // page the user is currently on.
  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false
    let interval
    let hadReassignment = false

    const reassignmentType = user.role === 'leadman' ? 'reassignment_leadman' : 'reassignment_employee'

    async function refreshNotificationCounts() {
      try {
        const counts = await fetchNotificationUnreadCountsApi()
        if (cancelled || !counts || typeof counts !== 'object') return

        const hasReassignment = Number(counts[reassignmentType] || 0) > 0

        setNotificationCounts(counts)

        if (!hadReassignment && hasReassignment) {
          const unread = await fetchNotificationsApi(true).catch(() => [])
          const items = Array.isArray(unread) ? unread.filter((item) => item.type === reassignmentType) : []
          if (items.length > 0) {
            dialog.success({
              title: items[0].title || 'Department reassigned',
              message: items.map((item) => item.message).join(' '),
            })
            await markNotificationsReadByTypeApi(reassignmentType).catch(() => {})
            setNotificationCounts((current) => ({ ...current, [reassignmentType]: 0 }))
            hadReassignment = false
          } else {
            hadReassignment = true
          }
        } else {
          hadReassignment = hasReassignment
        }
      } catch (error) {
        // ignore transient failures
      }
    }

    refreshNotificationCounts()
    interval = setInterval(refreshNotificationCounts, 5000)
    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role])

  async function markNotificationsSeen(type) {
    setNotificationCounts((current) => ({ ...current, [type]: 0 }))
    try {
      await markNotificationsReadByTypeApi(type)
    } catch (error) {
      // ignore — local state already cleared, next poll will reconcile
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ payments, leaveRequests, announcements, schedules }))
  }, [payments, leaveRequests])

  function addReportEntry(record) {
    const rawEmployeeId = record.employeeId ?? record.id ?? record.employee_id ?? record.identifier ?? record.raw?.employeeId ?? record.raw?.employee_id ?? ''
    let employeeId = Number(rawEmployeeId)
    if (Number.isNaN(employeeId)) employeeId = undefined
    const employeeName = String(record.employeeName || record.name || record.employee_name || record.fullName || record.raw?.employeeName || record.raw?.employee_name || '').trim()
    const department = String(record.department || record.dept || record.raw?.department || '').trim()
    const id = `RPT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    const capturedAt = record.scanCapturedAt || record.scannedAt || new Date().toISOString()
    const reportFields = record.qrFields || {}
    const batchId = String(record.batchId || record.raw?.batchId || id)
    const batchCapturedAt = record.batchCapturedAt || record.raw?.batchCapturedAt || capturedAt
    const batchEmployeeCount = Number(record.batchEmployeeCount || record.raw?.batchEmployeeCount || 1)
    const notes = record.notes || buildDepartmentReportSummary(department, reportFields) || null
    const product = String(record.product || '').trim()
    const quantity = Number(record.quantity || 0)
    const pricePerUnit = Number(record.pricePerUnit || 0)
    const amount = Number(record.amount || 0)
    const targetDepartment = String(record.targetDepartment || '').trim()
    const photos = record.photos || {}
    const raw = {
      ...(record.raw || {}),
      department,
      employeeId,
      employeeName,
      product,
      quantity,
      pricePerUnit,
      targetDepartment,
      reportFields,
      reportSummary: record.qrSummary || notes,
      capturedAt,
      batchId,
      batchCapturedAt,
      batchEmployeeCount,
    }

    try {
      setDailyReportDrafts((cur) => {
        const key = `${department}:${new Date(capturedAt).toISOString().slice(0, 10)}`
        const draft = cur[key] || { department, reportDate: new Date(capturedAt).toISOString().slice(0, 10), entries: [], summary: '', totalAmount: 0 }
        const entry = {
          id,
          batchId,
          batchCapturedAt,
          batchEmployeeCount,
          employeeId,
          employeeName,
          department,
          targetDepartment,
          scannedAt: capturedAt,
          product,
          quantity,
          pricePerUnit,
          amount,
          photos,
          raw,
          notes,
        }
        draft.entries = [entry, ...draft.entries]
        draft.totalAmount = (draft.totalAmount || 0) + Number(entry.amount || 0)
        return { ...cur, [key]: draft }
      })
    } catch (e) { /* ignore in non-browser env */ }

    return id
  }

  function updateEmployeeRecord(employeeId, updates = {}) {
    setEmployees((currentEmployees) => currentEmployees.map((employee) => (
      String(employee.employeeId) === String(employeeId)
        ? { ...employee, ...updates }
        : employee
    )))
  }


  function clearAll() {
    setPayments([])
    setLeaveRequests([])
  }

  function getEmployeeDepartment(employeeId) {
    // GM reassigns employees by editing `department` directly, and that's the
    // only path that changes it — so the live employee record is authoritative.
    const employee = employees.find((item) => String(item.employeeId) === String(employeeId));
    return employee?.department || null;
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
      const created = await createAnnouncementApi({ title: record.title, body: record.body, pinned: record.pinned, audience: payload.audience, visibility: payload.visibility, targetRoles: record.targetRoles })
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

  // Piece rate management
  function getRateFor(department, product) {
    const match = (rates || []).find((rate) => (
      String(rate.department || '').trim().toLowerCase() === String(department || '').trim().toLowerCase()
      && String(rate.product || '').trim().toLowerCase() === String(product || '').trim().toLowerCase()
    ))
    return match ? Number(match.pricePerUnit || 0) : null
  }

  function getRatesForDepartment(department) {
    return (rates || []).filter((rate) => String(rate.department || '').trim().toLowerCase() === String(department || '').trim().toLowerCase())
  }

  async function createRate(record) {
    const tempId = `RATE-${Date.now()}`
    const payload = { id: tempId, ...record }
    setRates((cur) => [...cur, payload])
    try {
      const created = await createRateApi({ department: record.department, product: record.product, pricePerUnit: record.pricePerUnit })
      setRates((cur) => cur.map((r) => (r.id === tempId ? created : r)))
      return created
    } catch (e) {
      setRates((cur) => cur.filter((r) => r.id !== tempId))
      throw e
    }
  }

  async function updateRate(id, updates) {
    const prev = rates.slice()
    setRates((cur) => cur.map((r) => (r.id === id ? { ...r, ...updates } : r)))
    try {
      const updated = await updateRateApi(id, updates)
      setRates((cur) => cur.map((r) => (r.id === id ? updated : r)))
      return updated
    } catch (e) {
      setRates(prev)
      throw e
    }
  }

  async function removeRate(id) {
    const prev = rates.slice()
    setRates((cur) => cur.filter((r) => r.id !== id))
    try {
      await deleteRateApi(id)
    } catch (e) {
      setRates(prev)
      throw e
    }
  }

  // Schedules feature removed from backend; keep stubs for compatibility
  async function createSchedule() { throw new Error('Schedules feature unavailable') }
  async function updateSchedule() { throw new Error('Schedules feature unavailable') }
  async function removeSchedule() { throw new Error('Schedules feature unavailable') }
  function getEmployeeSchedules() { return [] }

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
        const amount = Number(entry.amount || 0)

        return {
          id: entry.id || `${report.id}-${index}`,
          employeeId,
          employeeName,
          department,
          product: entry.product || '',
          quantity: Number(entry.quantity || 0),
          pricePerUnit: Number(entry.pricePerUnit || 0),
          scannedAt: createdAt,
          reportDate,
          reportId: report.id,
          summary: report.summary || '',
          amount,
          notes: entry.notes || report.summary || '',
          raw: entry.raw || entry,
          status: 'submitted',
        }
      })
    })
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


  function getDailyReportDraft(department, reportDate) {
    const key = `${department}:${new Date(reportDate).toISOString().slice(0, 10)}`
    const draft = dailyReportDrafts[key]

    if (!draft) {
      return {
        department,
        reportDate: new Date(reportDate).toISOString().slice(0, 10),
        entries: [],
        summary: '',
        totalAmount: 0,
      }
    }

    return {
      department: draft.department || department,
      reportDate: draft.reportDate || new Date(reportDate).toISOString().slice(0, 10),
      entries: Array.isArray(draft.entries) ? draft.entries : [],
      summary: draft.summary || '',
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
        totalAmount: remainingEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      }
      return next
    })
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
        const totalAmount = period.records.reduce((sum, record) => sum + Number(record.amount || 0), 0)
        return {
          ...period,
          totalAmount,
          recordCount: period.records.length,
          latestDate: period.records[0]?.scannedAt,
        }
      })
      .sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0))
  }

  async function submitDailyReport(department, reportDate, submittedBy, submittedByName, summary = '', entries = null) {
    const key = `${department}:${new Date(reportDate).toISOString().slice(0, 10)}`
    const draft = dailyReportDrafts[key]
    const resolvedEntries = Array.isArray(entries) ? entries : (draft?.entries || [])
    if (!draft && resolvedEntries.length === 0) throw new Error('No draft for selected department/date')
    const targetDepartment = resolvedEntries[0]?.targetDepartment || resolvedEntries[0]?.raw?.targetDepartment || undefined
    const payload = {
      department: draft?.department || department,
      targetDepartment,
      reportDate: draft?.reportDate || new Date(reportDate).toISOString().slice(0, 10),
      submittedBy,
      submittedByName,
      summary,
      entries: resolvedEntries,
    }
    try {
      const result = await submitDailyReportApi(payload)
      setDailyReports((current) => [result, ...current.filter((report) => String(report.id) !== String(result.id))])
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
          totalAmount: remainingEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
        }
        return next
      })
      return result
    } catch (e) {
      throw e
    }
  }

  async function resubmitDailyReport(reportId, payload) {
    const result = await resubmitDailyReportApi(reportId, payload)
    setDailyReports((current) => current.map((report) => (String(report.id) === String(reportId) ? result : report)))
    return result
  }

  async function approveDailyReport(reportId) {
    const result = await approveDailyReportApi(reportId)
    setDailyReports((current) => current.map((report) => (String(report.id) === String(reportId) ? result : report)))
    return result
  }

  function getPayslipPeriod(employeeId, period) {
    const records = getFinanceRecords().filter((record) => String(record.employeeId) === String(employeeId) && payrollCycleKey(record.scannedAt || record.reportDate || new Date().toISOString()) === period)
    return {
      records,
      totalAmount: records.reduce((sum, record) => sum + Number(record.amount || 0), 0),
    }
  }

  function getEmployeeTotals(employeeId) {
    const records = getFinanceRecords().filter((record) => String(record.employeeId) === String(employeeId))
    const totalAmount = records.reduce((sum, record) => sum + Number(record.amount || 0), 0)
    const todayKey = toManilaDateKey()
    const totalToday = records
      .filter((record) => toManilaDateKey(record.reportDate) === todayKey)
      .reduce((sum, record) => sum + Number(record.amount || 0), 0)
    const latestRecord = records[0] || null
    return {
      totalAmount,
      totalToday,
      latestRecord,
      currentDepartment: getEmployeeDepartment(employeeId),
      records,
    }
  }

  return (
    <AppDataContext.Provider
      value={{
        leaveRequests,
        submitLeaveRequest,
        approveLeaveRequest,
        addReportEntry,
        clearAll,
        getEmployeeDepartment,
        getEmployeeLeaveRequests,
        updateEmployeeRecord,
        getFinanceAttendance,
        getFinanceRecords,
        refreshDailyReports,
        getDailyReportDraft,
        removeDailyReportBatch,
        resubmitDailyReport,
        approveDailyReport,
        getPayslipPeriods,
        getPayslipPeriod,
        getEmployeeTotals,
        payments,
        formatDateTime,
        periodLabel,
        periodKey,
        payrollCycleKey,
        payrollCycleLabel,
        employeesLoading,
        DEPARTMENTS,
        buildDepartmentReportSummary,
        announcements,
        createAnnouncement,
        updateAnnouncement,
        removeAnnouncement,
        rates,
        getRateFor,
        getRatesForDepartment,
        createRate,
        updateRate,
        removeRate,
        notificationCounts,
        markNotificationsSeen,
        schedules,
        createSchedule,
        updateSchedule,
        removeSchedule,
        getEmployeeSchedules,
        activeReminders,
        employees,
        dailyReports,
        productionRecords,
        dailyReportDrafts,
        submitDailyReport,
        updateDailyReportStatus,
        rejectLeaveRequest,
        selectedLeadmanDepartment,
        setSelectedLeadmanDepartment,
        refreshEmployees,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export default AppDataProvider
