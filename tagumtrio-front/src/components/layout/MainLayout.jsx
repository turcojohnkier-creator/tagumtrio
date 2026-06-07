import { Outlet, NavLink, Navigate, useNavigate } from 'react-router-dom'
import PageTransition from '../ui/PageTransition'
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
      <div className="h-screen bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
        <header className="h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg"><QrCode className="w-5 h-5 text-white" /></div>
            <h1 className="text-lg font-bold text-white">TriOPS</h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {headerCounts.length > 0 && (
              <div className="hidden sm:flex items-center gap-2">
                {headerCounts.map((item) => (
                  <div key={item.label} className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-300">
                    <span className="text-slate-500">{item.label}</span> <span className="text-white font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="relative">
              <button onClick={() => setNotificationsOpen((open) => !open)} className="relative p-2 text-slate-400 hover:text-white transition-colors" aria-expanded={notificationsOpen} aria-label="Toggle notifications">
                <Bell className="w-5 h-5" />
                {notificationItems.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-[320px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      <p className="text-xs text-slate-500">Pending items and latest updates</p>
                    </div>
                    <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-400">No pending notifications.</div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {notificationItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="px-4 py-3 hover:bg-slate-900 transition-colors">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{new Date(item.meta).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-300 hidden sm:inline-block">{user.name}</span>
              <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 transition-colors p-2" title="Sign Out"><LogOut className="w-5 h-5" /></button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto"><div className="max-w-7xl mx-auto"><PageTransition><Outlet /></PageTransition></div></main>
      </div>
    )
  }

  const filteredNav = allNavItems.filter(i => i.roles.includes(user.role))

  return (
    <div className="h-screen bg-slate-900 text-slate-200 flex overflow-hidden">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)}></div>}

      <aside className={cn('fixed md:static inset-y-0 left-0 z-30 w-64 md:h-screen bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300', mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0')}>
        <div className="p-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-lg shadow-lg shadow-emerald-500/20"><QrCode className="w-6 h-6 text-white" /></div>
            <div>
              <h1 className="text-xl font-bold text-white">TriOPS</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">{user.role}</p>
            </div>
          </div>
          <button className="md:hidden p-2 text-slate-400" onClick={() => setMobileMenuOpen(false)}><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-2 px-3">Navigation Menu</div>
          {filteredNav.map(item => (
            <NavLink
              key={item.name}
              to={item.href}
              title={item.name}
              end={['/app/production', '/app/hr', '/app/gm/overview', '/app/gm/announcements', '/app/payroll', '/app/requests'].includes(item.href)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-slate-800/50 mb-3 border border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">{user.name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role.replace('_',' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><LogOut className="w-5 h-5" />Sign out</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 md:hidden" aria-label="Toggle navigation">
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <p className="text-sm font-semibold text-white">Workspace</p>
              <p className="text-xs text-slate-500">Dashboard & navigation</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setNotificationsOpen((open) => !open)} className="relative p-2 text-slate-400 hover:text-white transition-colors bg-slate-900 rounded-lg border border-slate-800" aria-expanded={notificationsOpen} aria-label="Toggle notifications">
                <Bell className="w-5 h-5" />
                {notificationItems.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                )}
              </button>

                  {notificationsOpen && (
                    <div className="absolute right-0 top-12 z-30 w-[340px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/30">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      <p className="text-xs text-slate-500">Pending approvals and scan queue</p>
                    </div>
                    <button onClick={() => setNotificationsOpen(false)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-400">No pending notifications.</div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {notificationItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="px-4 py-3 hover:bg-slate-900 transition-colors">
                            <p className="text-sm font-medium text-white">{item.title}</p>
                            <p className="text-xs text-slate-400 mt-1">{item.detail}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{new Date(item.meta).toLocaleString()}</p>
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

        <div className="flex-1 overflow-auto overflow-x-hidden p-4 sm:p-6 md:p-8"><div className="max-w-7xl mx-auto pb-12"><Outlet /></div></div>
      </main>
    </div>
  )
}
