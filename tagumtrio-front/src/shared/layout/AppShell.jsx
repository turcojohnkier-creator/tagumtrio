import { NavLink } from 'react-router-dom'
import { Bell, ChevronDown, LayoutGrid, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

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
  notificationItems = [],
  children,
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const closeMenus = () => {
    setMobileNavOpen(false)
    setNotificationsOpen(false)
    setUserMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-zinc-50/60">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 justify-self-start">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/30">
              <LayoutGrid className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="font-heading text-sm font-bold tracking-tight text-zinc-900">TriOPS</h1>
              {portalLabel ? <p className="hidden text-[11px] capitalize text-zinc-400 sm:block">{portalLabel}</p> : null}
            </div>
          </div>

          <nav className="hidden min-w-0 items-center justify-center gap-1 overflow-x-auto md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.end}
                className={({ isActive }) => cn(
                  'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-emerald-50 font-semibold text-emerald-700'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                )}
              >
                {item.icon ? <item.icon className="h-4 w-4" /> : null}
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-2">
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
                onClick={() => { setNotificationsOpen((open) => !open); setUserMenuOpen(false) }}
                className="relative rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                aria-expanded={notificationsOpen}
                aria-label="Toggle notifications"
              >
                <Bell className="h-4.5 w-4.5" />
                {notificationItems.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-30 w-[320px] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Notifications</p>
                      <p className="text-xs text-zinc-400">Pending items and latest updates</p>
                    </div>
                    <button onClick={() => setNotificationsOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notificationItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-zinc-500">No pending notifications.</div>
                    ) : (
                      <div className="divide-y divide-zinc-100">
                        {notificationItems.map((item, index) => (
                          <div key={`${item.title}-${index}`} className="px-4 py-3 transition-colors hover:bg-zinc-50">
                            <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                            <p className="mt-1 text-xs text-zinc-500">{item.detail}</p>
                            <p className="mt-1 text-[11px] text-zinc-400">{new Date(item.meta).toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative hidden sm:block">
              <button
                onClick={() => { setUserMenuOpen((open) => !open); setNotificationsOpen(false) }}
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
                    <p className="truncate text-xs capitalize text-zinc-400">{(user?.role || '').replace('_', ' ')}</p>
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

            <button
              onClick={() => setMobileNavOpen((open) => !open)}
              className="inline-flex items-center justify-center rounded-md border border-zinc-200 p-2 text-zinc-600 md:hidden"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.end}
                  onClick={closeMenus}
                  className={({ isActive }) => cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-emerald-50 font-semibold text-emerald-700'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  )}
                >
                  {item.icon ? <item.icon className="h-4 w-4" /> : null}
                  {item.name}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {getInitials(user?.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{user?.name}</p>
                  <p className="truncate text-xs capitalize text-zinc-400">{(user?.role || '').replace('_', ' ')}</p>
                </div>
              </div>
              <button onClick={onLogout} className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-rose-700 hover:bg-rose-50" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="px-4 py-6 sm:px-6 sm:py-8 md:py-10">
        <div className="mx-auto max-w-6xl pb-12">{children}</div>
      </main>
    </div>
  )
}
