import { useEffect, useState } from 'react'
import { AuthContext } from './auth-context'
import { clearAuthToken, loginApi, setAuthToken } from '../lib/api'
import { DEPARTMENTS } from '../constants/departments'

const AUTH_SESSION_KEY = 'triops-auth-session'

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase()
}

function normalizeRole(role) {
  if (!role) return role
  const normalized = String(role).trim().toLowerCase()
  if (normalized === 'production_head') return 'production_incharge'
  if (['admin', 'hr', 'human_resources', 'human-resource', 'human resources'].includes(normalized)) return 'hr'
  if (['general_manager', 'general manager', 'general-manager', 'gm'].includes(normalized)) return 'gm'
  if (['leadman', 'lead man', 'lead_man', 'lead-man'].includes(normalized)) return 'leadman'
  return normalized
}

function buildSessionUser(record) {
  if (!record) return null
  const normalizedRole = normalizeRole(record.role)
  const base = {
    id: record.id,
    name: record.name,
    role: normalizedRole,
    created_at: record.created_at || record.createdAt,
  }

  if (normalizedRole === 'leadman') {
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
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return window.localStorage.getItem('triops-lang') || 'en'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('triops-lang', language)
    } catch (e) {
      // ignore
    }
  }, [language])

  const translations = {
    en: {
      'login.welcome': 'Welcome back',
      'login.description': 'Log in with your registered username.',
      'login.identifier': 'Username',
      'login.password': 'Password',
      'login.remember': 'Remember me',
      'login.forgot': 'Forgot password?',
      'login.signin': 'Sign in',
      'leadman.portal': 'Leadman Portal',
      'leadman.create_report': 'Create Report',
      'leadman.incoming_reports': 'Incoming Reports',
      'leadman.deployed_workers': 'Deployed Workers',
      'leadman.daily_report': 'Daily Report',
      'leadman.history': 'History',
      'leadman.assigned': 'Assigned leadman departments',
      'ui.exit': 'Exit',
      'ui.navigation': 'Navigation',
      'ui.signed_in': 'Signed in as',
      'ui.sign_out': 'Sign out',
      'gm.overview.title': 'Department cards',
      'gm.overview.desc': 'Tap a card to open the active employee roster and reassign team members.',
      'gm.overview.departments': 'departments',
      'gm.overview.most': 'Most staffed',
      'gm.overview.least': 'Least staffed',
      'gm.employee.title': 'Employee Management',
      'gm.employee.desc': 'View and manage employee records backed by the database.',
      'gm.employee.search': 'Search employees...',
      'gm.employee.all_depts': 'All Departments',
      'gm.employee.no_match': 'No employees matched your filters.',
      'gm.announce.title': 'Announcements',
      'gm.announce.desc': 'Broadcast Facebook-style posts to all employees.',
      'gm.announce.create': 'Create broadcast',
      'gm.announce.post': 'Post to all employees',
      'gm.announce.what': "What's the announcement?",
      'gm.announce.body': 'Write the post body...',
      'gm.announce.pin': 'Pin to top of employee feeds',
      'gm.announce.broadcast': 'Broadcasted to all employees',
      'gm.announce.posting': 'Posting...',
      'gm.announce.publish': 'Publish Post',
      'gm.announce.recent': 'Recent announcements',
      'gm.announce.no': 'No announcements yet.',
      'gm.announce.ann_title': 'Announcement title',
      'gm.announce.ann_body': 'Announcement body',
      'gm.announce.pin_top': 'Pin to top',
      'gm.announce.cancel': 'Cancel',
      'gm.announce.saving': 'Saving...',
      'gm.announce.save': 'Save changes',
      'gm.announce.edit': 'Edit post',
      'gm.announce.delete': 'Delete post',
    },
    zh: {
      'login.welcome': '欢迎回来',
      'login.description': '使用您注册的用户名登录。',
      'login.identifier': '用户名',
      'login.password': '密码',
      'login.remember': '记住我',
      'login.forgot': '忘记密码？',
      'login.signin': '登录',
      'leadman.portal': '领班门户',
      'leadman.create_report': '创建报表',
      'leadman.incoming_reports': '待处理报表',
      'leadman.deployed_workers': '在岗员工',
      'leadman.daily_report': '日报',
      'leadman.history': '历史记录',
      'leadman.assigned': '分配的领班部门',
      'ui.exit': '退出',
      'ui.navigation': '导航',
      'ui.signed_in': '登录用户',
      'ui.sign_out': '登出',
      'gm.overview.title': '部门卡片',
      'gm.overview.desc': '点击卡片查看在职员工名单并重新分配团队成员。',
      'gm.overview.departments': '个部门',
      'gm.overview.most': '人数最多',
      'gm.overview.least': '人数最少',
      'gm.employee.title': '员工管理',
      'gm.employee.desc': '查看和管理数据库中的员工记录。',
      'gm.employee.search': '搜索员工...',
      'gm.employee.all_depts': '所有部门',
      'gm.employee.no_match': '没有符合筛选条件的员工。',
      'gm.announce.title': '公告',
      'gm.announce.desc': '向所有员工广播类似Facebook的帖子。',
      'gm.announce.create': '创建广播',
      'gm.announce.post': '发布给所有员工',
      'gm.announce.what': '公告标题是什么？',
      'gm.announce.body': '编写帖子内容...',
      'gm.announce.pin': '置顶到员工源',
      'gm.announce.broadcast': '已发布给所有员工',
      'gm.announce.posting': '发布中...',
      'gm.announce.publish': '发布帖子',
      'gm.announce.recent': '最近公告',
      'gm.announce.no': '还没有公告。',
      'gm.announce.ann_title': '公告标题',
      'gm.announce.ann_body': '公告内容',
      'gm.announce.pin_top': '置顶',
      'gm.announce.cancel': '取消',
      'gm.announce.saving': '保存中...',
      'gm.announce.save': '保存更改',
      'gm.announce.edit': '编辑帖子',
      'gm.announce.delete': '删除帖子',
    },
  }

  function t(key, fallback) {
    const val = (translations[language] && translations[language][key]) || translations.en[key]
    return val || fallback || key
  }

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

  const logout = () => {
    clearAuthToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, users, login, loginWithCredentials, logout, language, setLanguage, t }}>{children}</AuthContext.Provider>
  )
}
