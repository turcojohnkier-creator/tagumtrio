import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom'
import PageTransition from '../../shared/ui/PageTransition'
import { Bell, LogOut, Menu, QrCode, X, Users, Factory, FileSpreadsheet, LayoutDashboard, CalendarDays, BarChart3, Megaphone } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { useQr } from '../../context/qr-context'
import { useMemo, useState, useEffect } from 'react'
import { DEPARTMENTS } from '../../constants/departments'

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

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
  const { getEmployeeDepartmentRequests, getEmployeeAttendance, getLeadmanDepartmentRequests, getLeadmanAttendance, getHeadPendingAttendance, getFinancePayrollCycles, getFinancePayments, getUnseenEmployeeReassignmentNotifications, getUnseenLeadmanReassignmentNotifications, markReassignmentNotificationsSeen } = useQr()
  const dialog = useDialog()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

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

  const leadmanDepartments = Array.isArray(user?.departments) && user.departments.length > 0
    ? user.departments
    : (user?.department ? [user.department] : DEPARTMENTS)

  const leadmanRequestCount = user?.role === 'leadman'
    ? leadmanDepartments.reduce((sum, department) => sum + getLeadmanDepartmentRequests(department).length, 0)
    : 0
  const leadmanPendingScanCount = user?.role === 'leadman'
    ? leadmanDepartments.reduce((sum, department) => {
        return sum + getLeadmanAttendance(department).filter((record) => record.status === 'leadman_verified').length
      }, 0)
    : 0
  const headerCounts = user?.role === 'leadman'
      ? [
          { label: 'Requests', value: leadmanRequestCount },
          { label: 'Pending', value: leadmanPendingScanCount },
        ]
      : []

  useEffect(() => {
  if (!user?.id) return;
  if (user?.role !== 'leadman' && user?.role !== 'employee') return;

  // 1. Get the unseen items
  const unseen = user?.role === 'leadman'
    ? getUnseenLeadmanReassignmentNotifications(user.id, leadmanDepartments)
    : getUnseenEmployeeReassignmentNotifications(user.id, user.id);

  // 2. Only proceed if there are actual notifications
  if (unseen.length === 0) return;

  // 3. Mark as seen BEFORE showing the dialog to prevent re-triggering 
  // during the time the user is reading the message
  markReassignmentNotificationsSeen(user.id, unseen.map((item) => item.id));

  // 4. Show the dialog
  dialog.success({
    title: user?.role === 'leadman'
      ? unseen.length === 1 ? 'Employee reassigned' : `${unseen.length} employees reassigned`
      : unseen.length === 1 ? 'Department reassigned' : `${unseen.length} department updates`,
    message: unseen.map((item) => {
      if (user?.role === 'leadman') {
        return `${item.employeeName} was reassigned from ${item.oldDepartment} to ${item.targetDepartment}`;
      }
      return `You were reassigned from ${item.oldDepartment} to ${item.targetDepartment}`;
    }).join('. '),
  });
  
  // Note: We removed the dependency array variables that were triggering the loop 
  // If your linter complains, ignore it or wrap the getter functions in useCallback in your Provider
}, [user?.id, user?.role, leadmanDepartments, dialog, getUnseenEmployeeReassignmentNotifications, getUnseenLeadmanReassignmentNotifications, markReassignmentNotificationsSeen])

  const notificationItems = useMemo(() => {
    if (user?.role === 'leadman') {
      return [
        ...leadmanDepartments.flatMap((department) => getLeadmanDepartmentRequests(department))
          .filter((request) => request.status === 'pending')
          .map((request) => ({
            title: `Approve ${request.employeeName}`,
            detail: `${request.employeeId} • wants ${request.requestedDepartment}`,
            meta: request.requestedAt,
          })),
        ...leadmanDepartments.flatMap((department) => getLeadmanAttendance(department))
          .filter((record) => record.status === 'leadman_verified')
          .slice(0, 3)
          .map((record) => ({
            title: `${record.employeeName} scan awaiting head`,
            detail: record.department,
            meta: record.scannedAt,
          })),
        ...getUnseenLeadmanReassignmentNotifications(user.id, leadmanDepartments).slice(0, 3).map((notification) => ({
          title: `${notification.employeeName} reassigned`,
          detail: `${notification.oldDepartment} → ${notification.targetDepartment}`,
          meta: notification.createdAt,
        })),
      ]
    }

    if (user?.role === 'employee') {
      return getUnseenEmployeeReassignmentNotifications(user.id, user.id).slice(0, 5).map((notification) => ({
        title: `Department reassigned`,
        detail: `${notification.oldDepartment} → ${notification.targetDepartment}`,
        meta: notification.createdAt,
      }))
    }

    if (user?.role === 'production_incharge' || user?.role === 'hr' || user?.role === 'admin') {
      return getHeadPendingAttendance().slice(0, 5).map((record) => ({
        title: `${record.employeeName} verification pending`,
        detail: record.department,
        meta: record.leadmanVerifiedAt,
      }))
    }

    if (user?.role === 'finance') {
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
    }

    return []
  }, [
    getHeadPendingAttendance,
    getFinancePayments,
    getFinancePayrollCycles,
    getLeadmanAttendance,
    getLeadmanDepartmentRequests,
    getUnseenLeadmanReassignmentNotifications,
    getUnseenEmployeeReassignmentNotifications,
    leadmanDepartments,
    user?.id,
    user?.role,
  ])

    if (user.role === 'employee' || user.role === 'leadman') {
    return (
      <div className="h-screen bg-white text-slate-800 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500 p-1.5 rounded-md"><QrCode className="w-4 h-4 text-slate-900" /></div>
            <h1 className="text-sm font-semibold text-slate-900">TriOPS</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {headerCounts.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                {headerCounts.map((item) => (
                  <div key={item.label} className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
                    <span className="text-slate-400">{item.label}</span> <span className="text-slate-900 font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <button onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-expanded={notificationsOpen} aria-label="Toggle notifications">
                <Bell className="w-4.5 h-4.5" />
                {notificationItems.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-11 z-30 w-[320px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Notifications</p>
                      <p className="text-xs text-slate-400">Pending items and latest updates</p>
                    </div>
                    <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">No pending notifications.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notificationItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{new Date(item.meta).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700 hidden sm:inline-block">{user.name}</span>
              <button onClick={handleLogout} className="rounded-md p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 transition-colors" title="Sign Out"><LogOut className="w-4.5 h-4.5" /></button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto"><div className="max-w-6xl mx-auto"><PageTransition><Outlet /></PageTransition></div></main>
      </div>
    )
  }

  const filteredNav = allNavItems.filter(i => i.roles.includes(user.role))

  return (
    <div className="h-screen bg-white text-slate-800 flex overflow-hidden">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden pointer-events-auto" onClick={() => setMobileMenuOpen(false)}></div>}

      <aside className={cn('fixed md:static inset-y-0 left-0 z-30 w-60 md:h-screen bg-white border-r border-slate-200 flex flex-col transition-transform duration-200', mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        <div className="px-4 py-4 flex items-center justify-between md:justify-start gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-500 p-1.5 rounded-md"><QrCode className="w-4 h-4 text-slate-900" /></div>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-slate-900">TriOPS</h1>
              <p className="text-[11px] text-slate-400 truncate capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button className="md:hidden rounded-md p-1.5 text-slate-500" onClick={() => setMobileMenuOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">Navigation</p>
          {filteredNav.map(item => (
            <NavLink
              key={item.name}
              to={item.href}
              title={item.name}
              end={['/app/production', '/app/hr', '/app/gm/overview', '/app/gm/announcements', '/app/payroll', '/app/requests'].includes(item.href)}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-emerald-50 font-medium text-emerald-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
            <div className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700">{user.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
              <p className="text-[11px] text-slate-400 truncate capitalize">{user.role.replace('_',' ')}</p>
            </div>
            <button onClick={handleLogout} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors" aria-label="Sign out" title="Sign out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-600 md:hidden" aria-label="Toggle navigation">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div />

          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" aria-expanded={notificationsOpen} aria-label="Toggle notifications">
                <Bell className="w-4.5 h-4.5" />
                {notificationItems.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                )}
              </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-11 z-30 w-[340px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Notifications</p>
                      <p className="text-xs text-slate-400">Pending approvals and scan queue</p>
                    </div>
                    <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-slate-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">No pending notifications.</div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notificationItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
                            <p className="text-[11px] text-slate-400 mt-1">{new Date(item.meta).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto overflow-x-hidden p-4 sm:p-6 md:p-8"><div className="max-w-6xl mx-auto pb-12"><Outlet /></div></div>
      </main>
    </div>
  )
}
