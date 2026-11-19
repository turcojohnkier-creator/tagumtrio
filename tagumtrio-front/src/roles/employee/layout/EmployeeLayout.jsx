import { Navigate, Outlet } from 'react-router-dom'
import { CalendarClock, FileText, History, LayoutDashboard, Megaphone, Settings } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import PageTransition from '../../../shared/ui/PageTransition'
import AppShell from '../../../shared/layout/AppShell'

const navItemDefs = [
  { name: 'Overview', href: '/app/portal', icon: LayoutDashboard, end: true },
  { name: 'Announcements', href: '/app/portal/announcements', icon: Megaphone, notificationType: 'announcement_new' },
  { name: 'Leave', href: '/app/portal/leaves', icon: CalendarClock, notificationType: 'leave_request_status' },
  { name: 'Payslips', href: '/app/portal/payslips', icon: FileText, notificationType: 'payslip_released' },
  { name: 'History', href: '/app/portal/history', icon: History },
  { name: 'Settings', href: '/app/portal/settings', icon: Settings },
]

export default function EmployeeLayout() {
  const { user } = useAuth()
  const { notificationCounts = {} } = useAppData()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'employee') {
    return <Navigate to="/app" replace />
  }

  const navItems = navItemDefs.map((item) => ({
    ...item,
    hasUnread: item.notificationType ? Number(notificationCounts[item.notificationType] || 0) > 0 : false,
  }))

  return (
    <AppShell user={user} navItems={navItems} portalLabel="Employee Portal" settingsHref="/app/portal/settings">
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}