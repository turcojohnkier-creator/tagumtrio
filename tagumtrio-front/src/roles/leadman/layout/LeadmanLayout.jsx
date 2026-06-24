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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50 px-4 md:px-6">
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700 md:hidden" aria-label="Toggle leadman navigation">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
<div className="hidden items-center gap-3 md:flex">

          </div>
          <div className="hidden items-center gap-3 md:flex">
            
            
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-400">{selectedLeadmanDepartment || user.department || t('leadman.assigned', 'Assigned leadman departments')}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-700 flex items-center justify-center text-sm font-semibold ring-1 ring-emerald-500/20">
              {user.name.split(' ').map((part) => part[0]).join('').substring(0, 2)}
            </div>
          </div>

          <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:text-rose-700 md:hidden">
            <X className="h-4 w-4" />
            {t('ui.exit', 'Exit')}
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl pb-12">
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