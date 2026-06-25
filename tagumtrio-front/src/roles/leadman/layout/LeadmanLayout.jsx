import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { ClipboardList, FileText, ScanLine, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import PageTransition from '../../../shared/ui/PageTransition'
import ErrorBoundary from '../../../shared/ui/ErrorBoundary'
import AppShell from '../../../shared/layout/AppShell'

export default function LeadmanLayout() {
  const { user, logout, t } = useAuth()
  const { selectedLeadmanDepartment } = useAppData()
  const navigate = useNavigate()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'leadman') {
    return <Navigate to="/app" replace />
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const navItems = [
    { name: t('leadman.create_report', 'Create Report'), href: '/app/leadman', icon: ScanLine, end: true },
    { name: t('leadman.incoming_reports', 'Incoming Reports'), href: '/app/leadman/reports', icon: ClipboardList },
    { name: t('leadman.deployed_workers', 'Deployed Workers'), href: '/app/leadman/workers', icon: Users },
    { name: t('leadman.daily_report', 'Daily Report'), href: '/app/leadman/report', icon: FileText },
    { name: t('leadman.history', 'History'), href: '/app/leadman/history', icon: FileText },
  ]

  return (
    <AppShell
      user={user}
      navItems={navItems}
      portalLabel={selectedLeadmanDepartment || user.department || t('leadman.assigned', 'Assigned leadman departments')}
      onLogout={handleLogout}
    >
      <ErrorBoundary>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </ErrorBoundary>
    </AppShell>
  )
}