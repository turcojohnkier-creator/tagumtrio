import { Link, NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatRole } from '../../lib/roles'
import { useAuth } from '../../context/auth-context'
import logo from '../../assets/tagumtrio-logo.jpg'

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
  settingsHref,
  headerCounts = [],
  children,
}) {
  const { language, setLanguage, t } = useAuth()

  const roleLabel = t(`role.${user?.role}`, formatRole(user?.role))
  const settingsLabel = t('nav.settings', 'Settings')

  const languageToggle = () => (
    user?.role === 'gm' ? (
      <button
        type="button"
        onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
        className="shrink-0 whitespace-nowrap rounded-md border border-white bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-900 shadow-sm transition-colors hover:bg-emerald-50"
        aria-label={t('ui.toggle_language')}
        title={t('ui.toggle_language')}
      >
        {language === 'zh' ? 'EN' : '中文'}
      </button>
    ) : null
  )

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-emerald-950/40 bg-gradient-to-b from-emerald-900 to-[#06402B] md:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/20">
            <img src={logo} alt="Tagum Trio Lumber Corporation" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 leading-tight">
            <h1 className="font-heading text-sm font-bold leading-snug tracking-tight text-white">Tagum Trio Lumber Corporation</h1>
            {portalLabel ? <p className="truncate text-[11px] capitalize text-emerald-200/70">{portalLabel}</p> : null}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              title={item.name}
              className={({ isActive }) => cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'text-white' : 'text-emerald-100/70 hover:bg-white/5 hover:text-white'
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive ? (
                    <motion.span
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-white/10 ring-1 ring-white/15"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  ) : null}
                  {item.icon ? <item.icon className="relative z-10 h-5 w-5 shrink-0" /> : null}
                  <span className="relative z-10 truncate">{item.name}</span>
                  {item.hasUnread ? (
                    <span className="relative z-10 ml-auto h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 px-3 py-4">
          {headerCounts.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {headerCounts.map((item) => (
                <div key={item.label} className="rounded-md bg-white/10 px-2.5 py-1 text-xs text-emerald-100/80">
                  <span className="text-emerald-200/60">{item.label}</span>{' '}
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {languageToggle()}

          <Link
            to={settingsHref}
            className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-white/10"
            aria-label={settingsLabel}
            title={settingsLabel}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white ring-1 ring-white/20">
              {getInitials(user?.name)}
            </div>
            <div className="min-w-0 flex-1 text-left leading-tight">
              <p className="truncate text-sm font-medium text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-emerald-200/70">{roleLabel}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-emerald-950/40 bg-emerald-900 md:hidden">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-white/20">
              <img src={logo} alt="Tagum Trio Lumber Corporation" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate font-heading text-xs font-bold leading-tight tracking-tight text-white">Tagum Trio Lumber Corporation</h1>
              {portalLabel ? <p className="truncate text-[11px] capitalize text-emerald-200/70">{portalLabel}</p> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {languageToggle()}

            <Link
              to={settingsHref}
              className="flex items-center rounded-md px-1 py-1 transition-colors hover:bg-white/10"
              aria-label={settingsLabel}
              title={settingsLabel}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white ring-1 ring-white/20">
                {getInitials(user?.name)}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-emerald-950/40 bg-emerald-900/90 px-2 py-2 shadow-lg shadow-emerald-950/30 backdrop-blur-xl">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.end}
              className={({ isActive }) => cn(
                'relative flex shrink-0 items-center justify-center rounded-full p-3 transition-colors',
                isActive ? 'bg-emerald-400 text-emerald-950 shadow-sm' : 'text-emerald-200/70 hover:text-white'
              )}
              aria-label={item.name}
            >
              {item.icon ? <item.icon className="h-6 w-6" /> : null}
              {item.hasUnread ? (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-emerald-900" />
              ) : null}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:pl-[17.5rem] md:pr-6 md:py-10">
        <div className="mx-auto max-w-6xl pb-28 md:pb-12">{children}</div>
      </main>
    </div>
  )
}
