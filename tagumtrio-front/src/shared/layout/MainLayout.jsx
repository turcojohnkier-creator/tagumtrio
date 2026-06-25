import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import PageTransition from '../../shared/ui/PageTransition'
import { Users, Factory, FileSpreadsheet, LayoutDashboard, CalendarDays, Megaphone } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { useMemo } from 'react'
import AppShell from './AppShell'

const allNavItems = [
  { name: 'Departments Overview', href: '/app/gm/overview', icon: Users, roles: ['gm'] },
  { name: 'Employees', href: '/app/gm/employees', icon: Users, roles: ['gm'] },
  { name: 'Production', href: '/app/production', icon: Factory, roles: ['production_incharge', 'leadman', 'gm'] },
  { name: 'Reports', href: '/app/production/reports', icon: FileSpreadsheet, roles: ['production_incharge'] },
  { name: 'All Accounts', href: '/app/hr/employees', icon: Users, roles: ['hr'] },
  { name: 'Create Accounts', href: '/app/hr/create-account', icon: Users, roles: ['hr'] },
  { name: 'Announcements', href: '/app/gm/announcements', icon: Megaphone, roles: ['gm'] },
  { name: 'Finance Home', href: '/app/payroll', icon: LayoutDashboard, roles: ['finance'] },
  { name: 'Daily Production', href: '/app/payroll/production', icon: CalendarDays, roles: ['finance'] },
  { name: 'Department Employees', href: '/app/payroll/employees', icon: Users, roles: ['finance'] },
  { name: 'Requests', href: '/app/requests', icon: FileSpreadsheet, roles: ['gm'] },
]

export default function MainLayout() {
  const { user, logout } = useAuth()
  const { getFinancePayrollCycles, getFinancePayments } = useAppData()
  const navigate = useNavigate()

  const notificationItems = useMemo(() => {
    if (user?.role !== 'finance') return []

    const payrollCycles = getFinancePayrollCycles()
    const recentPayments = getFinancePayments().slice(0, 3)

    return [
      ...payrollCycles.slice(0, 3).map((cycle) => ({
        title: `Review ${cycle.label}`,
        detail: `${cycle.employeeCount} employees • ₱${cycle.totalAmount.toLocaleString()} ready for release`,
        meta: cycle.latestDate,
      })),
      ...recentPayments.map((payment) => ({
        title: `Payslip released for ${payment.employeeId}`,
        detail: `₱${Number(payment.amount || 0).toLocaleString()} • cycle ${payment.period}`,
        meta: payment.releasedAt,
      })),
    ]
  }, [getFinancePayments, getFinancePayrollCycles, user?.role])

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
      // GM's Production link redirects to /app/production/consolidated, so it can't be an exact ("end") match.
      end: item.href === '/app/production' && user.role === 'gm'
        ? false
        : ['/app/production', '/app/hr', '/app/gm/overview', '/app/gm/announcements', '/app/payroll', '/app/requests'].includes(item.href),
    }))

  return (
    <AppShell
      user={user}
      navItems={filteredNav}
      portalLabel={user.role.replace('_', ' ')}
      onLogout={handleLogout}
      notificationItems={notificationItems}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
