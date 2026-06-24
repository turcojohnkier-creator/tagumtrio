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
  const initials = (user?.name || 'LM').split(' ').map((part) => part[0]).join('').substring(0, 2).toUpperCase()

  return (
    <aside className={cn('fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500">
          <QrCode className="h-4 w-4 text-slate-900" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold text-slate-900">TriOPS</h1>
          <p className="truncate text-[11px] text-slate-400">{t('leadman.portal', 'Leadman Portal')}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        <p className="px-2 pb-1.5 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">{t('ui.navigation', 'Navigation')}</p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={onNavigate}
            className={({ isActive }) => cn('flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors', isActive ? 'bg-emerald-50 font-medium text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}
          >
            <link.icon className="h-4 w-4" />
            <span>{t(link.key, link.label)}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">{initials}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{user?.name || 'Leadman'}</p>
            <p className="truncate text-[11px] text-slate-400">{t('ui.signed_in', 'Signed in')}</p>
          </div>
          <button onClick={onLogout} className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700" aria-label={t('ui.sign_out', 'Sign out')} title={t('ui.sign_out', 'Sign out')}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}