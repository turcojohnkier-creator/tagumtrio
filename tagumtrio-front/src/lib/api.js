function normalizeBaseUrl(value) {
  if (!value) return '/api'
  return String(value).replace(/\/$/, '')
}

const BASE_API_URL = normalizeBaseUrl(import.meta.env.VITE_API_URL || '/api')
const AUTH_TOKEN_KEY = 'triops-auth-token'
const AUTH_SESSION_KEY = 'triops-auth-session'
const SUBMITTED_REPORTS_KEY = 'triops-submitted-daily-reports'

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token)
    return
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_SESSION_KEY)
}

export function hasAuthToken() {
  if (typeof window === 'undefined') return false
  return Boolean(window.localStorage.getItem(AUTH_TOKEN_KEY))
}

function getAuthHeaders() {
  if (typeof window === 'undefined') return {}
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiRequest(path, options = {}) {
  let res
  try {
    res = await fetch(`${BASE_API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      ...options,
    })
  } catch (error) {
    const networkError = new Error('Network error. Check backend server and CORS settings.')
    networkError.code = 'NETWORK_ERROR'
    throw networkError
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    const apiError = new Error(payload?.detail || payload?.message || res.statusText || 'API request failed.')
    apiError.status = res.status

    if (res.status === 401 && typeof window !== 'undefined') {
      clearAuthToken()
      window.dispatchEvent(new Event('triops-auth-unauthorized'))
    }

    throw apiError
  }

  if (res.status === 204) {
    return null
  }

  return res.json()
}

function persistSession(user, token) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user, token }))
  setAuthToken(token)
}

function loadSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.user || null
  } catch {
    return null
  }
}

export async function loginApi({ identifier, password }) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: normalizeIdentifier(identifier), password }),
  })
  persistSession(result.user, result.access_token || result.accessToken)
  return result
}

export async function registerApi(payload) {
  const normalizedPayload = {
    ...payload,
    identifier: normalizeIdentifier(payload.identifier),
  }
  return apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify(normalizedPayload),
  })
}

export async function meApi() {
  return apiRequest('/auth/me')
}

export async function fetchEmployeesApi() {
  return apiRequest('/v1/employees')
}

export async function createEmployeeAccountApi(payload) {
  return apiRequest('/v1/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchEmployeesByDepartmentApi(department) {
  const q = department ? `?department=${encodeURIComponent(department)}` : ''
  try {
    return await apiRequest(`/v1/employees${q}`)
  } catch (e) {
    return []
  }
}


export async function fetchDepartmentRequestsApi() {
  return apiRequest('/v1/department-requests')
}

export async function createDepartmentRequestApi(payload) {
  return apiRequest('/v1/department-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function approveDepartmentRequestApi(requestId, leadmanId) {
  const q = leadmanId ? `?leadmanId=${encodeURIComponent(leadmanId)}` : ''
  return apiRequest(`/v1/department-requests/${requestId}/approve${q}`, {
    method: 'PATCH',
  })
}

export async function redirectDepartmentRequestApi(requestId, payload, leadmanId) {
  const q = leadmanId ? `?leadmanId=${encodeURIComponent(leadmanId)}` : ''
  return apiRequest(`/v1/department-requests/${requestId}/redirect${q}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function fetchDailyReportsApi(params = {}) {
  const query = new URLSearchParams()
  if (params.department) query.set('department', params.department)
  if (params.reportDate) query.set('reportDate', params.reportDate)

  try {
    return await apiRequest(`/v1/daily-reports${query.toString() ? `?${query.toString()}` : ''}`)
  } catch {
    if (typeof window === 'undefined') return []
    return []
  }
}

export async function submitDailyReportApi(payload) {
  return apiRequest('/v1/daily-reports', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateDailyReportApi(reportId, payload) {
  return apiRequest(`/v1/daily-reports/${encodeURIComponent(reportId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function fetchPayrollCyclesApi() {
  return apiRequest('/v1/payroll/cycles')
}

export async function fetchPayrollCycleDetailsApi(cycleKey) {
  return apiRequest(`/v1/payroll/cycles/${encodeURIComponent(cycleKey)}`)
}

export async function fetchPayrollPaymentsApi() {
  return apiRequest('/v1/payroll/payments')
}

export async function releasePayrollApi(payload) {
  return apiRequest('/v1/payroll/release', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchProductionApi() {
  return []
}

export async function createProductionApi(payload) {
  return payload
}

export async function bulkUploadScansApi(scans) {
  return { accepted: scans.map((scan) => scan.id), rejected: [] }
}

export async function submitLeaveRequestApi(payload) {
  return apiRequest('/v1/leave-requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchLeaveRequestsApi() {
  return apiRequest('/v1/leave-requests')
}

export async function approveLeaveRequestApi(requestId, approverId, payload = {}) {
  const q = approverId ? `?approverId=${encodeURIComponent(approverId)}` : ''
  return apiRequest(`/v1/leave-requests/${requestId}/approve${q}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function rejectLeaveRequestApi(requestId, approverId, payload = {}) {
  const q = approverId ? `?approverId=${encodeURIComponent(approverId)}` : ''
  return apiRequest(`/v1/leave-requests/${requestId}/reject${q}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function updateEmployeeApi(employeeId, payload) {
  return apiRequest(`/v1/employees/${encodeURIComponent(employeeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

// Announcements API
export async function fetchAnnouncementsApi() {
  return apiRequest('/v1/announcements')
}

export async function createAnnouncementApi(payload) {
  return apiRequest('/v1/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAnnouncementApi(id, payload) {
  return apiRequest(`/v1/announcements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteAnnouncementApi(id) {
  return apiRequest(`/v1/announcements/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// Schedules API removed (not used). Frontend no longer calls /v1/schedules.
