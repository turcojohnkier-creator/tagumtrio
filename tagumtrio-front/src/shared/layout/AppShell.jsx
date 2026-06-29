import { NavLink } from 'react-router-dom'
import { ChevronDown, LayoutGrid, LogOut } from 'lucide-react'
import { useState } from 'react'
import { formatRole } from '../../lib/roles'
import { useAuth } from '../../context/auth-context'

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

function getInitials(name) {
  return (name || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()
}

export default function AppShell({
  user,
  navItems = [],
  portalLabel,
  onLogout,
  headerCounts = [],
  children,
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { language, setLanguage, t } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-50/60">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 md:h-20 md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-2.5 justify-self-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/30 md:h-11 md:w-11">
              <LayoutGrid className="h-4.5 w-4.5 text-white md:h-5 md:w-5" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="font-heading text-sm font-bold tracking-tight text-zinc-900 md:text-base">TriOPS</h1>
              {portalLabel ? <p className="hidden text-[11px] capitalize text-zinc-400 sm:block">{portalLabel}</p> : null}
            </div>
          </div>

          <nav className="hidden min-w-0 items-center justify-center gap-1 overflow-x-auto md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                title={item.name}
                aria-label={item.name}
                className={({ isActive }) => cn(
                  'relative flex shrink-0 items-center justify-center rounded-full p-2.5 transition-colors md:p-3',
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )}
              >
                {item.icon ? <item.icon className="h-4 w-4 md:h-5 md:w-5" /> : null}
                {item.hasUnread ? (
                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
                ) : null}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-2">
            {user?.role === 'gm' ? (
              <button
                type="button"
                onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                aria-label={t('ui.toggle_language')}
                title={t('ui.toggle_language')}
              >
                {language === 'zh' ? 'EN' : '中文'}
              </button>
            ) : null}

            {headerCounts.length > 0 && (
              <div className="hidden items-center gap-2 lg:flex">
                {headerCounts.map((item) => (
                  <div key={item.label} className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600">
                    <span className="text-zinc-400">{item.label}</span> <span className="font-medium text-zinc-900">{item.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-zinc-100"
                aria-expanded={userMenuOpen}
                aria-label="Toggle account menu"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {getInitials(user?.name)}
                </div>
                <span className="hidden text-sm font-medium text-zinc-700 lg:inline-block">{user?.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                  <div className="border-b border-zinc-200 px-4 py-3">
                    <p className="truncate text-sm font-medium text-zinc-900">{user?.name}</p>
                    <p className="truncate text-xs text-zinc-400">{t(`role.${user?.role}`, formatRole(user?.role))}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-700 transition-colors hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex items-center gap-1 rounded-full border border-zinc-200/70 bg-white/80 px-2 py-2 shadow-lg shadow-zinc-900/10 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={({ isActive }) => cn(
                'relative flex items-center justify-center rounded-full p-3 transition-colors',
                isActive ? 'bg-emerald-500 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              )}
              aria-label={item.name}
            >
              {item.icon ? <item.icon className="h-5 w-5" /> : null}
              {item.hasUnread ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />
              ) : null}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <div className="mx-auto max-w-6xl pb-28 md:pb-12">{children}</div>
      </main>
    </div>
  )
}
