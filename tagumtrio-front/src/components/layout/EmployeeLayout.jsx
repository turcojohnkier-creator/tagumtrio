import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X, QrCode } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import PageTransition from '../ui/PageTransition'
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
    <div className="flex h-screen overflow-hidden bg-slate-900 text-slate-200">
      {mobileMenuOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />}

      <EmployeeSidebar user={user} onLogout={handleLogout} onNavigate={() => setMobileMenuOpen(false)} mobileOpen={mobileMenuOpen} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:px-6">
          <button onClick={() => setMobileMenuOpen((open) => !open)} className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 md:hidden" aria-label="Toggle employee navigation">
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-3 md:flex">

          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-500">{user.department || 'Department pending'}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white ring-1 ring-slate-700">
              {user.name.split(' ').map((part) => part[0]).join('').substring(0, 2)}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl pb-12">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  )
}