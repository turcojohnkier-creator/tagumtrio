import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { CalendarClock, FileText, LayoutDashboard, Megaphone } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import PageTransition from '../../../shared/ui/PageTransition'
import AppShell from '../../../shared/layout/AppShell'

const navItems = [
  { name: 'Overview', href: '/app/portal', icon: LayoutDashboard, end: true },
  { name: 'Announcements', href: '/app/portal/announcements', icon: Megaphone },
  { name: 'Leave', href: '/app/portal/leaves', icon: CalendarClock },
  { name: 'Payslips', href: '/app/portal/payslips', icon: FileText },
]

export default function EmployeeLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'employee') {
    return <Navigate to="/app" replace />
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <AppShell user={user} navItems={navItems} portalLabel="Employee Portal" onLogout={handleLogout}>
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}