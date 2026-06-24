import { NavLink } from 'react-router-dom'
import { ClipboardList, FileText, LogOut, QrCode, ScanLine, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const links = [
  { to: '/app/leadman', key: 'leadman.create_report', label: 'Create Report', icon: ScanLine, end: true },
  { to: '/app/leadman/reports', key: 'leadman.incoming_reports', label: 'Incoming Reports', icon: ClipboardList },
  { to: '/app/leadman/workers', key: 'leadman.deployed_workers', label: 'Deployed Workers', icon: Users },
  { to: '/app/leadman/report', key: 'leadman.daily_report', label: 'Daily Report', icon: FileText },
  { to: '/app/leadman/history', key: 'leadman.history', label: 'History', icon: FileText },
]

export default function LeadmanSidebar({ user, onLogout, onNavigate, mobileOpen = false }) {
  const { t } = useAuth()
  return (
    <aside className={cn('fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform duration-300 md:static md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="border-b border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 p-2 shadow-lg shadow-emerald-500/20">
            <QrCode className="h-6 w-6 text-slate-900" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('leadman.portal', 'Leadman Portal')}</p>
            <h1 className="truncate text-lg font-semibold text-slate-900">TriOPS</h1>

          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">{t('ui.navigation', 'Navigation')}</p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors', isActive ? 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20' : 'text-slate-500 hover:bg-white hover:text-slate-800')}
          >
            <link.icon className="h-4 w-4" />
            <span>{t(link.key, link.label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">{t('ui.signed_in', 'Signed in as')}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.name || 'Leadman'}</p>
        </div>
        <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-700">
          <LogOut className="h-4 w-4" />
          {t('ui.sign_out', 'Sign out')}
        </button>
      </div>
    </aside>
  )
}