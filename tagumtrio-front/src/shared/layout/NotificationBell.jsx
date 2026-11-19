import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CheckCheck, Volume2, VolumeX, X } from 'lucide-react'
import {
  isNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
  subscribeNotificationSound,
} from '../../lib/notificationSound'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { OPEN_NOTIFICATIONS_EVENT, TONE_CLASSES, getNotificationMeta, timeAgo } from './notification-meta'

/**
 * Bell with the unread count; opens a panel of recent notifications.
 * `placement="sidebar"` (desktop) opens the panel beside the sidebar,
 * `placement="header"` (mobile top bar) opens it as a sheet under the bar.
 */
export default function NotificationBell({ placement = 'sidebar' }) {
  const { t } = useAuth()
  const { notifications = [], unreadTotal = 0, markNotificationRead, markAllNotificationsRead } = useAppData()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(isNotificationSoundEnabled)
  const rootRef = useRef(null)

  // Keep the desktop and mobile bells in sync when either one toggles sound.
  useEffect(() => subscribeNotificationSound(setSoundOn), [])

  function toggleSound() {
    const next = !soundOn
    setNotificationSoundEnabled(next)
    // Preview the chime when turning it on.
    if (next) playNotificationSound({ force: true })
  }

  // Close on outside click / Esc.
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('touchstart', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('touchstart', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // The "N new updates" toast asks the bell to open.
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_NOTIFICATIONS_EVENT, onOpen)
  }, [])

  function openNotification(item) {
    markNotificationRead?.(item)
    setOpen(false)
    if (item.link) navigate(item.link)
  }

  const badge = unreadTotal > 9 ? '9+' : String(unreadTotal)
  const isSidebar = placement === 'sidebar'
  const panelPosition = isSidebar
    ? 'fixed left-[16.5rem] top-4 w-[24rem] max-h-[calc(100vh-2rem)]'
    : 'fixed inset-x-2 top-16 max-h-[calc(100vh-9rem)]'

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadTotal > 0 ? `${t('notifications.title', 'Notifications')} (${unreadTotal})` : t('notifications.title', 'Notifications')}
        aria-expanded={open}
        className={`relative flex items-center justify-center rounded-lg text-emerald-100 transition-colors hover:bg-white/10 hover:text-white ${isSidebar ? 'h-9 w-9' : 'h-9 w-9'} ${open ? 'bg-white/10 text-white' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadTotal > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-emerald-900">
            {badge}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="dialog"
            aria-label={t('notifications.title', 'Notifications')}
            className={`${panelPosition} z-[60] flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl`}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3">
              <div>
                <h2 className="font-heading text-base font-bold text-zinc-900">{t('notifications.title', 'Notifications')}</h2>
                <p className="text-xs text-zinc-500">
                  {unreadTotal > 0
                    ? `${unreadTotal} ${t('notifications.unread', 'unread')}`
                    : t('notifications.all_caught_up', "You're all caught up")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-pressed={soundOn}
                  aria-label={soundOn ? t('notifications.sound_off', 'Turn notification sound off') : t('notifications.sound_on', 'Turn notification sound on')}
                  title={soundOn ? t('notifications.sound_off', 'Turn notification sound off') : t('notifications.sound_on', 'Turn notification sound on')}
                  className={`rounded-md p-1.5 transition-colors hover:bg-zinc-100 ${soundOn ? 'text-emerald-700' : 'text-zinc-400 hover:text-zinc-700'}`}
                >
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                {unreadTotal > 0 ? (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsRead?.()}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {t('notifications.mark_all_read', 'Mark all as read')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('notifications.close', 'Close')}
                  className="btn-dismiss rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium text-zinc-700">{t('notifications.empty_title', 'No notifications yet')}</p>
                  <p className="text-xs text-zinc-500">{t('notifications.empty_desc', 'Updates about your reports and requests will show up here.')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-100">
                  {notifications.map((item) => {
                    const { icon: Icon, tone } = getNotificationMeta(item.type)
                    const unread = !item.readAt
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => openNotification(item)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 ${unread ? 'bg-emerald-50/40' : ''}`}
                        >
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone] || TONE_CLASSES.info}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className={`text-sm ${unread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'}`}>{item.title}</span>
                              <span className="shrink-0 text-[11px] text-zinc-400">{timeAgo(item.createdAt)}</span>
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500">{item.message}</span>
                          </span>
                          {unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label={t('notifications.unread', 'unread')} /> : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
