import { Outlet, Navigate } from 'react-router-dom'
import PageTransition from '../../shared/ui/PageTransition'
import { Bell, Users, UserPlus, Building2, Factory, FileSpreadsheet, History, Megaphone, Tag, Settings, Undo2 } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { formatRole } from '../../lib/roles'
import AppShell from './AppShell'

const allNavItems = [
  { name: 'Departments Overview', i18nKey: 'nav.departments_overview', href: '/app/gm/overview', icon: Building2, roles: ['gm', 'hr'] },
  { name: 'Employees', i18nKey: 'nav.employees', href: '/app/gm/employees', icon: Users, roles: ['gm'] },
  { name: 'Production', i18nKey: 'nav.production', href: '/app/production', icon: Factory, roles: ['production_incharge', 'leadman', 'gm'], notificationType: { gm: 'daily_report_gm_pending', production_incharge: 'daily_report_ready_to_compile' } },
  { name: 'Returned by GM', i18nKey: 'nav.returned_by_gm', href: '/app/production/returned', icon: Undo2, roles: ['production_incharge'], notificationType: 'daily_report_gm_returned' },
  { name: 'All Accounts', i18nKey: 'nav.all_accounts', href: '/app/hr/employees', icon: Users, roles: ['hr'] },
  { name: 'Create Accounts', i18nKey: 'nav.create_accounts', href: '/app/hr/create-account', icon: UserPlus, roles: ['hr'] },
  { name: 'Announcements', i18nKey: 'nav.announcements', href: '/app/gm/announcements', icon: Megaphone, roles: ['gm'] },
  { name: 'Announcements', i18nKey: 'nav.announcements', href: '/app/announcements', icon: Megaphone, roles: ['production_incharge'], notificationType: 'announcement_new' },
  { name: 'Rate Management', i18nKey: 'nav.rate_management', href: '/app/gm/rates', icon: Tag, roles: ['gm'] },
  { name: 'Requests', i18nKey: 'nav.requests', href: '/app/requests', icon: FileSpreadsheet, roles: ['gm', 'production_incharge'], notificationType: 'leave_request_new' },
  { name: 'History', i18nKey: 'nav.history', href: '/app/history', icon: History, roles: ['production_incharge', 'gm'] },
  { name: 'Notifications', i18nKey: 'nav.notifications', href: '/app/notifications', icon: Bell, roles: ['gm', 'hr', 'production_incharge'], showUnreadTotal: true },
  { name: 'Settings', i18nKey: 'nav.settings', href: '/app/settings', icon: Settings, roles: ['gm', 'hr', 'production_incharge', 'leadman'] },
]

export default function MainLayout() {
  const { user, t } = useAuth()
  const { notificationCounts = {}, unreadTotal = 0 } = useAppData()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'employee') {
    return <Navigate to="/app/portal" replace />
  }

  const filteredNav = allNavItems
    .filter((item) => item.roles.includes(user.role))
    .map((item) => {
      // notificationType: a type, a list of types, or a {role: type(s)} map when
      // each role watches a different queue. Any unread one lights the dot.
      const raw = item.notificationType && !Array.isArray(item.notificationType) && typeof item.notificationType === 'object'
        ? item.notificationType[user.role]
        : item.notificationType
      const types = Array.isArray(raw) ? raw : raw ? [raw] : []
      return {
      ...item,
      name: t(item.i18nKey, item.name),
      href: item.href,
      hasUnread: types.some((type) => Number(notificationCounts[type] || 0) > 0),
      // The Notifications tab shows the total unread count instead of a dot.
      badgeCount: item.showUnreadTotal ? unreadTotal : 0,
      // GM's Production link redirects to /app/production/consolidated, so it can't be an exact ("end") match.
      end: item.href === '/app/production' && user.role === 'gm'
        ? false
        : ['/app/production', '/app/hr', '/app/gm/overview', '/app/gm/announcements', '/app/requests'].includes(item.href),
      }
    })

  return (
    <AppShell
      user={user}
      navItems={filteredNav}
      portalLabel={t(`role.${user.role}`, formatRole(user.role))}
      settingsHref="/app/settings"
      notificationsHref="/app/notifications"
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
