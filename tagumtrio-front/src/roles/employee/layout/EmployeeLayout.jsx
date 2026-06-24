import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, QrCode } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import PageTransition from '../../../shared/ui/PageTransition'
import EmployeeSidebar from './EmployeeSidebar'

export default function EmployeeLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <div className="flex h-screen overflow-hidden bg-white text-slate-800">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden pointer-events-auto" onClick={() => setMobileMenuOpen(false)} />}

      <EmployeeSidebar user={user} onLogout={handleLogout} onNavigate={() => setMobileMenuOpen(false)} mobileOpen={mobileMenuOpen} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-md border border-slate-200 p-1.5 text-slate-600 md:hidden" aria-label="Toggle employee navigation">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div />

          <div className="hidden items-center gap-2 sm:flex">
            <p className="text-sm font-medium text-slate-900">{user.name}</p>
            <span className="text-slate-300">·</span>
            <p className="text-sm text-slate-500">{user.department || 'Department pending'}</p>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl pb-12">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  )
}