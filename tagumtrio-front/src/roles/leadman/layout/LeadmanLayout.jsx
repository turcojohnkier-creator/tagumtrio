import { Navigate, Outlet } from 'react-router-dom'
import { Bell, ClipboardList, History, Megaphone, ScanLine, Settings, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import PageTransition from '../../../shared/ui/PageTransition'
import ErrorBoundary from '../../../shared/ui/ErrorBoundary'
import AppShell from '../../../shared/layout/AppShell'

export default function LeadmanLayout() {
  const { user, t } = useAuth()
  const { selectedLeadmanDepartment, notificationCounts = {}, unreadTotal = 0 } = useAppData()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'leadman') {
    return <Navigate to="/app" replace />
  }

  const navItems = [
    { name: t('leadman.create_report', 'Create Report'), href: '/app/leadman', icon: ScanLine, end: true },
    { name: t('leadman.incoming_reports', 'Incoming Reports'), href: '/app/leadman/reports', icon: ClipboardList, hasUnread: Number(notificationCounts.daily_report_incoming || 0) > 0 || Number(notificationCounts.daily_report_rejected || 0) > 0 },
    { name: t('leadman.deployed_workers', 'Deployed Workers'), href: '/app/leadman/workers', icon: Users, hasUnread: Number(notificationCounts.employee_account_created || 0) > 0 },
    { name: t('leadman.history', 'History'), href: '/app/leadman/history', icon: History, hasUnread: Number(notificationCounts.daily_report_verified || 0) > 0 || Number(notificationCounts.daily_report_approved || 0) > 0 },
    { name: t('nav.announcements', 'Announcements'), href: '/app/leadman/announcements', icon: Megaphone, hasUnread: Number(notificationCounts.announcement_new || 0) > 0 },
    { name: t('nav.notifications', 'Notifications'), href: '/app/leadman/notifications', icon: Bell, badgeCount: unreadTotal },
    { name: t('nav.settings', 'Settings'), href: '/app/leadman/settings', icon: Settings },
  ]

  return (
    <AppShell
      user={user}
      navItems={navItems}
      portalLabel={selectedLeadmanDepartment || user.department || t('leadman.assigned', 'Assigned leadman departments')}
      settingsHref="/app/leadman/settings"
      notificationsHref="/app/leadman/notifications"
    >
      <ErrorBoundary>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </ErrorBoundary>
    </AppShell>
  )
}