import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import PageTransition from '../../shared/ui/PageTransition'
import { Users, UserPlus, Building2, Factory, FileSpreadsheet, Megaphone, Tag } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { formatRole } from '../../lib/roles'
import AppShell from './AppShell'

const allNavItems = [
  { name: 'Departments Overview', href: '/app/gm/overview', icon: Building2, roles: ['gm'] },
  { name: 'Employees', href: '/app/gm/employees', icon: Users, roles: ['gm'] },
  { name: 'Production', href: '/app/production', icon: Factory, roles: ['production_incharge', 'leadman', 'gm'], notificationType: 'daily_report_gm_pending' },
  { name: 'Reports', href: '/app/production/reports', icon: FileSpreadsheet, roles: ['production_incharge'] },
  { name: 'All Accounts', href: '/app/hr/employees', icon: Users, roles: ['hr'] },
  { name: 'Create Accounts', href: '/app/hr/create-account', icon: UserPlus, roles: ['hr'] },
  { name: 'Announcements', href: '/app/gm/announcements', icon: Megaphone, roles: ['gm'] },
  { name: 'Rate Management', href: '/app/gm/rates', icon: Tag, roles: ['gm'] },
  { name: 'Requests', href: '/app/requests', icon: FileSpreadsheet, roles: ['gm'], notificationType: 'leave_request_new' },
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const { notificationCounts = {} } = useAppData()
  const navigate = useNavigate()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'employee') {
    return <Navigate to="/app/portal" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = allNavItems
    .filter((item) => item.roles.includes(user.role))
    .map((item) => ({
      ...item,
      href: item.href,
      hasUnread: item.notificationType ? Number(notificationCounts[item.notificationType] || 0) > 0 : false,
      // GM's Production link redirects to /app/production/consolidated, so it can't be an exact ("end") match.
      end: item.href === '/app/production' && user.role === 'gm'
        ? false
        : ['/app/production', '/app/hr', '/app/gm/overview', '/app/gm/announcements', '/app/requests'].includes(item.href),
    }))

  return (
    <AppShell
      user={user}
      navItems={filteredNav}
      portalLabel={formatRole(user.role)}
      onLogout={handleLogout}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
