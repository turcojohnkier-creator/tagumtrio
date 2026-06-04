import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context'
import { clearAuthToken, loginApi, registerApi, setAuthToken } from '../lib/api'
import { DEPARTMENTS } from '../constants/departments'

const AUTH_SESSION_KEY = 'triops-auth-session'

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRole(role) {
  if (!role) return role
  if (role === 'production_head') return 'production_incharge'
  if (role === 'admin') return 'hr'
  return role
}

function buildSessionUser(record) {
  if (!record) return null
  const base = {
    id: record.id,
    name: record.name,
    role: normalizeRole(record.role),
    created_at: record.created_at || record.createdAt,
  }

  if (record.role === 'leadman') {
    const leadmanDepartments = Array.isArray(record.departments) && record.departments.length > 0
      ? record.departments.filter((department) => DEPARTMENTS.includes(department))
      : record.department && DEPARTMENTS.includes(record.department)
        ? [record.department]
        : []
    return {
      ...base,
      department: leadmanDepartments[0] || (record.department && DEPARTMENTS.includes(record.department) ? record.department : DEPARTMENTS[0]),
      departments: leadmanDepartments,
    }
  }

  if (record.department) {
    return { ...base, department: record.department }
  }

  return base
}

function loadSession() {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.user?.id) return null
    setAuthToken(parsed.token || parsed.accessToken || '')
    // Normalize legacy leadman saved sessions while preserving the assigned department list.
    if (parsed.user.role === 'leadman') {
      if (Array.isArray(parsed.user.departments)) {
        parsed.user.departments = parsed.user.departments.filter((department) => DEPARTMENTS.includes(department))
      }
      if (!parsed.user.departments || parsed.user.departments.length === 0) {
        parsed.user.departments = parsed.user.department && DEPARTMENTS.includes(parsed.user.department) ? [parsed.user.department] : []
      }
      if (!parsed.user.department && parsed.user.departments.length > 0) {
        parsed.user.department = parsed.user.departments[0]
      }
    }
    return buildSessionUser(parsed.user)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadSession())
  const [users] = useState([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user) {
      window.localStorage.removeItem(AUTH_SESSION_KEY)
      clearAuthToken()
      return
    }
    const token = window.localStorage.getItem('triops-auth-token') || ''
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ user, token }))
  }, [user])

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('triops-auth-unauthorized', handleUnauthorized)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('triops-auth-unauthorized', handleUnauthorized)
      }
    }
  }, [])

  // On first load, silently try to restore session from existing token
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (user) return
    const token = window.localStorage.getItem('triops-auth-token') || ''
    if (!token) return

    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
        if (!mounted) return
        if (!res.ok) {
          clearAuthToken()
          setUser(null)
          return
        }
        const result = await res.json()
        setAuthToken(token)
        setUser(buildSessionUser(result))
      } catch (e) {
        clearAuthToken()
        setUser(null)
      }
    })()

    return () => { mounted = false }
  }, [])

  const login = (role) => {
    if (!role) {
      setUser(null)
      return
    }

    const normalizedRole = normalizeRole(role)
    const fallback = {
      id: Date.now(),
      identifier: `${normalizedRole}@triops.local`,
      name: normalizedRole.replace('_', ' ').replace(/\b\w/g, (s) => s.toUpperCase()),
      role: normalizedRole,
      department: normalizedRole === 'leadman' ? DEPARTMENTS[0] : undefined,
      departments: normalizedRole === 'leadman' ? [DEPARTMENTS[0]] : undefined,
      status: 'active',
      is_active: true,
    }
    setUser(buildSessionUser(fallback))
  }

  const loginWithCredentials = async ({ identifier, password }) => {
    try {
      const result = await loginApi({ identifier: normalizeIdentifier(identifier), password })
      const token = result.accessToken || result.access_token || ''
      setAuthToken(token)
      setUser(buildSessionUser(result.user))
      return { ok: true, user: buildSessionUser(result.user) }
    } catch (error) {
      return { ok: false, error: error.message || 'Unable to sign in.' }
    }
  }

  const registerUser = async ({ name, identifier, password, role, department, departments }) => {
    try {
      const created = await registerApi({
        name: String(name || '').trim(),
        identifier: normalizeIdentifier(identifier),
        password,
        role,
        department,
        departments,
      })
      return { ok: true, user: buildSessionUser(created) }
    } catch (error) {
      return { ok: false, error: error.message || 'Unable to register account.' }
    }
  }

  const logout = () => {
    clearAuthToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, users, login, loginWithCredentials, registerUser, logout }}>{children}</AuthContext.Provider>
}
