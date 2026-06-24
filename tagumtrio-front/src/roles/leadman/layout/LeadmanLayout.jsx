import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useQr } from '../../../context/qr-context'
import PageTransition from '../../../shared/ui/PageTransition'
import ErrorBoundary from '../../../shared/ui/ErrorBoundary'
import LeadmanSidebar from './LeadmanSidebar'

export default function LeadmanLayout() {
  const { user, logout, t } = useAuth()
  const { selectedLeadmanDepartment } = useQr()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-800">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden pointer-events-auto" onClick={() => setMobileMenuOpen(false)} />}

      <LeadmanSidebar user={user} onLogout={handleLogout} onNavigate={() => setMobileMenuOpen(false)} mobileOpen={mobileMenuOpen} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-600 md:hidden" aria-label="Toggle leadman navigation">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-2 sm:flex">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <span className="text-slate-300">·</span>
            <p className="text-sm text-slate-500">{selectedLeadmanDepartment || user.department || t('leadman.assigned', 'Assigned leadman departments')}</p>
          </div>

          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 hover:text-rose-700 md:hidden">
            <X className="h-4 w-4" />
            {t('ui.exit', 'Exit')}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl pb-12">
            <ErrorBoundary>
              <PageTransition>
                <Outlet />
              </PageTransition>
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  )
}