import { useEffect, useState } from 'react'
import { useAuth } from './auth-context'
import { useDialog } from './dialog-context'
import { AppDataContext } from './app-data-context'
import { DEPARTMENTS } from '../constants/departments'
import { buildDepartmentReportSummary } from '../constants/department-report-fields'
import { toManilaDateKey } from '../lib/datetime'
import { buildReportEntry } from '../shared/reports/build-report-entry'

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
  fetchNotificationSummaryApi,
  fetchNotificationsApi,
  markNotificationReadApi,
  markNotificationsReadByTypeApi,
  hasAuthToken,
} from '../lib/api'
import { startVisiblePolling } from '../lib/polling'
import { playNotificationSound } from '../lib/notificationSound'

const NOTIFICATION_POLL_MS = 8000
const NOTIFICATION_LIST_LIMIT = 20
// More than this many new notifications in one poll collapse into one summary toast.
const MAX_TOASTS_AT_ONCE = 3
// These keep their blocking dialog (they change where the user works) instead of a toast.
const REASSIGNMENT_TYPES = new Set(['reassignment_leadman', 'reassignment_employee'])

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
  dailyReportDrafts: {},
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
      dailyReportDrafts: parsed.dailyReportDrafts && typeof parsed.dailyReportDrafts === 'object' ? parsed.dailyReportDrafts : DEFAULT_STATE.dailyReportDrafts,
    }
  } catch {
    return DEFAULT_STATE
  }
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
  const [dailyReportDrafts, setDailyReportDrafts] = useState(initialState.dailyReportDrafts || {})
  const [payments, setPayments] = useState(initialState.payments || [])
  const [announcements, setAnnouncements] = useState(initialState.announcements || [])
  const [rates, setRates] = useState([])
  const [notificationCounts, setNotificationCounts] = useState({})
  const [notifications, setNotifications] = useState([])
  const [toasts, setToasts] = useState([])
  const [updateSignals, setUpdateSignals] = useState({})
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

  // Poll announcements every 10s while the tab is visible.
  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false

    async function refreshAnnouncements() {
      try {
        const annResp = await fetchAnnouncementsApi()
        if (!cancelled && Array.isArray(annResp)) setAnnouncements(annResp)
      } catch { /* ignore */ }
    }

    const stop = startVisiblePolling(refreshAnnouncements, 10000)
    return () => {
      cancelled = true
      stop()
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

    async function refreshLeaveRequests() {
      try {
        const remote = await fetchLeaveRequestsApi()
        if (!cancelled && Array.isArray(remote)) setLeaveRequests(remote)
      } catch (error) {
        // ignore transient failures
      }
    }

    const stop = startVisiblePolling(refreshLeaveRequests, 5000)
    return () => {
      cancelled = true
      stop()
    }
  }, [user?.id])

  // One notification poll drives everything "live":
  //   - notificationCounts -> nav red dots
  //   - notifications      -> the bell's list
  //   - toasts             -> popups for notifications that arrived since the last poll
  //   - updateSignals      -> per-type counters pages watch to reload themselves
  // Department reassignment keeps its blocking dialog instead of a toast.
  // Paused while the tab is hidden (see startVisiblePolling).
  useEffect(() => {
    if (!user) return
    if (!hasAuthToken()) return
    let cancelled = false
    let seeded = false
    let showingReassignment = false
    const seenIds = new Set()
    const reassignmentType = user.role === 'leadman' ? 'reassignment_leadman' : 'reassignment_employee'

    async function showReassignmentDialog() {
      showingReassignment = true
      try {
        const unread = await fetchNotificationsApi(true).catch(() => [])
        const items = Array.isArray(unread) ? unread.filter((item) => item.type === reassignmentType) : []
        if (cancelled || items.length === 0) return
        dialog.success({
          title: items[0].title || 'Department reassigned',
          message: items.map((item) => item.message).join(' '),
        })
        await markNotificationsReadByTypeApi(reassignmentType).catch(() => {})
        setNotificationCounts((current) => ({ ...current, [reassignmentType]: 0 }))
      } finally {
        showingReassignment = false
      }
    }

    async function pollNotifications() {
      const summary = await fetchNotificationSummaryApi(NOTIFICATION_LIST_LIMIT).catch(() => null)
      if (cancelled || !summary || typeof summary !== 'object') return
      const counts = summary.unreadCounts && typeof summary.unreadCounts === 'object' ? summary.unreadCounts : {}
      const recent = Array.isArray(summary.recent) ? summary.recent : []

      setNotificationCounts(counts)
      setNotifications(recent)

      // The first poll only seeds what already existed — no toast storm on login.
      const arrived = seeded ? recent.filter((item) => !seenIds.has(item.id) && !item.readAt) : []
      recent.forEach((item) => seenIds.add(item.id))
      seeded = true

      if (arrived.length > 0) {
        // One chime per batch of new notifications (muted from the bell panel).
        playNotificationSound()
        setUpdateSignals((current) => {
          const next = { ...current }
          arrived.forEach((item) => { next[item.type] = (next[item.type] || 0) + 1 })
          return next
        })
        const toastable = arrived.filter((item) => !REASSIGNMENT_TYPES.has(item.type))
        if (toastable.length > 0) {
          setToasts((current) => {
            const fresh = toastable.length > MAX_TOASTS_AT_ONCE
              ? [{ key: `summary-${Date.now()}`, count: toastable.length }]
              : toastable.slice().reverse().map((item) => ({ key: item.id, notification: item }))
            return [...current, ...fresh].slice(-MAX_TOASTS_AT_ONCE)
          })
        }
      }

      if (Number(counts[reassignmentType] || 0) > 0 && !showingReassignment) {
        showReassignmentDialog()
      }
    }

    const stop = startVisiblePolling(pollNotifications, NOTIFICATION_POLL_MS)
    return () => {
      cancelled = true
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role])

  // Local state first so dots/badges clear instantly; the next poll reconciles.
  function markLocalRead(predicate) {
    const now = new Date().toISOString()
    setNotifications((current) => current.map((item) => (predicate(item) && !item.readAt ? { ...item, readAt: now } : item)))
  }

  async function markNotificationsSeen(type) {
    setNotificationCounts((current) => ({ ...current, [type]: 0 }))
    markLocalRead((item) => item.type === type)
    try {
      await markNotificationsReadByTypeApi(type)
    } catch (error) {
      // ignore — local state already cleared, next poll will reconcile
    }
  }

  async function markNotificationRead(notification) {
    if (!notification?.id || notification.readAt) return
    setNotificationCounts((current) => ({
      ...current,
      [notification.type]: Math.max(0, Number(current[notification.type] || 0) - 1),
    }))
    markLocalRead((item) => item.id === notification.id)
    try {
      await markNotificationReadApi(notification.id)
    } catch {
      // ignore — next poll reconciles
    }
  }

  async function markAllNotificationsRead() {
    setNotificationCounts({})
    markLocalRead(() => true)
    try {
      await markNotificationsReadByTypeApi()
    } catch {
      // ignore — next poll reconciles
    }
  }

  function dismissToast(key) {
    setToasts((current) => current.filter((toast) => toast.key !== key))
  }

  const unreadTotal = Object.values(notificationCounts || {}).reduce((sum, count) => sum + Number(count || 0), 0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const state = { payments, leaveRequests, announcements, schedules, dailyReportDrafts }
    // Report drafts hold their photos as data URLs, copied onto every worker's
    // entry, so a big batch easily passes the ~5 MB storage quota. setItem then
    // throws, and an error here (above every error boundary) blanked the whole
    // app. Fall back to saving without drafts: they stay in memory until
    // submitted but won't survive a reload, rather than reloading photo-less.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Report drafts are too large to save in browser storage; keeping them in memory only.', error)
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, dailyReportDrafts: {} }))
      } catch {
        // storage unavailable — nothing else to do
      }
    }
  }, [payments, leaveRequests, dailyReportDrafts])

  function addReportEntry(record) {
    const entry = buildReportEntry(record)
    const { id, department, scannedAt: capturedAt } = entry

    try {
      setDailyReportDrafts((cur) => {
        const key = `${department}:${toManilaDateKey(capturedAt)}`
        const existing = cur[key] || { department, reportDate: toManilaDateKey(capturedAt), entries: [], summary: '', totalAmount: 0 }
        // Build a NEW draft instead of mutating `existing` (which is the
        // current state object). React may run this updater twice (StrictMode
        // does in dev); mutating made the second run append the worker again,
        // duplicating entries — and their pay — in the submitted report.
        const existingEntries = Array.isArray(existing.entries) ? existing.entries : []
        if (existingEntries.some((item) => item.id === id)) return cur
        const draft = {
          ...existing,
          entries: [entry, ...existingEntries],
          totalAmount: (existing.totalAmount || 0) + Number(entry.amount || 0),
        }
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
        startDate: record.startDate,
        endDate: record.endDate,
        reason: record.reason,
      })
      setLeaveRequests((cur) => cur.map((r) => (r.id === tempId ? { ...created } : r)))
      return created.id
    } catch (error) {
      // Roll back the optimistic entry — it never actually got created server-side.
      setLeaveRequests((cur) => cur.filter((r) => r.id !== tempId))
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

  // Profile picture URL for anyone shown by id/name (report submitters, report
  // entries, leave requesters, ...). The signed-in user's own picture comes from
  // the session so a fresh upload shows up immediately.
  function getAvatarFor(employeeId, employeeName) {
    if (user) {
      const isSelf = employeeId !== undefined && employeeId !== null && employeeId !== ''
        ? String(employeeId) === String(user.id)
        : Boolean(employeeName) && String(employeeName).toLowerCase() === String(user.name || '').toLowerCase()
      if (isSelf) return user.avatar_url || null
    }
    if ((employeeId === undefined || employeeId === null || employeeId === '') && !employeeName) return null
    return resolveEmployeeRecord(employeeId, employeeName)?.avatar_url || null
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
    const key = `${department}:${toManilaDateKey(reportDate)}`
    const draft = dailyReportDrafts[key]

    if (!draft) {
      return {
        department,
        reportDate: toManilaDateKey(reportDate),
        entries: [],
        summary: '',
        totalAmount: 0,
      }
    }

    return {
      department: draft.department || department,
      reportDate: draft.reportDate || toManilaDateKey(reportDate),
      entries: Array.isArray(draft.entries) ? draft.entries : [],
      summary: draft.summary || '',
      totalAmount: Number(draft.totalAmount || 0),
    }
  }

  function removeDailyReportBatch(department, reportDate, batchId) {
    const key = `${department}:${toManilaDateKey(reportDate)}`
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

  async function submitDailyReport(department, reportDate, submittedBy, submittedByName, summary = '', entries = null) {
    const key = `${department}:${toManilaDateKey(reportDate)}`
    const draft = dailyReportDrafts[key]
    const resolvedEntries = Array.isArray(entries) ? entries : (draft?.entries || [])
    if (!draft && resolvedEntries.length === 0) throw new Error('No draft for selected department/date')
    const targetDepartment = resolvedEntries[0]?.targetDepartment || resolvedEntries[0]?.raw?.targetDepartment || undefined
    const payload = {
      department: draft?.department || department,
      targetDepartment,
      reportDate: draft?.reportDate || toManilaDateKey(reportDate),
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
        getEmployeeTotals,
        payments,
        formatDateTime,
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
        notifications,
        unreadTotal,
        updateSignals,
        toasts,
        dismissToast,
        markNotificationRead,
        markAllNotificationsRead,
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
        getAvatarFor,
      }}
    >
      {children}
    </AppDataContext.Provider>
  )
}

export default AppDataProvider
