import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { TONE_CLASSES, getNotificationMeta } from '../layout/notification-meta'

const AUTO_HIDE_MS = 6000

function Toast({ toast, onDismiss, onOpen }) {
  const { t } = useAuth()
  // The provider re-renders on every poll, giving a new onDismiss each time;
  // a ref keeps the auto-hide timer from restarting on each re-render.
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(toast.key), AUTO_HIDE_MS)
    return () => clearTimeout(timer)
  }, [toast.key])

  const item = toast.notification
  const { icon: Icon, tone } = item ? getNotificationMeta(item.type) : { icon: Bell, tone: 'info' }
  const title = item ? item.title : `${t('notifications.you_have', 'You have')} ${toast.count} ${t('notifications.new_updates', 'new updates')}`
  const message = item ? item.message : t('notifications.open_to_see', 'Open notifications to see them all.')

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.98 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg"
      role="status"
    >
      <button type="button" onClick={() => onOpen(toast)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone] || TONE_CLASSES.info}`}>
          <Icon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-zinc-900">{title}</span>
          <span className="mt-0.5 line-clamp-2 block text-xs text-zinc-500">{message}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onDismiss(toast.key)}
        aria-label={t('notifications.dismiss', 'Dismiss')}
        className="btn-dismiss shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  )
}

// Popups for notifications that arrive while the app is open (see the
// notification poll in the app data provider). Click opens the related page.
// The "N new updates" summary toast opens the Notifications page.
export default function NotificationToasts({ notificationsHref }) {
  const { toasts = [], dismissToast, markNotificationRead } = useAppData()
  const navigate = useNavigate()

  function open(toast) {
    dismissToast(toast.key)
    if (toast.notification) {
      markNotificationRead?.(toast.notification)
      if (toast.notification.link) navigate(toast.notification.link)
    } else if (notificationsHref) {
      navigate(notificationsHref)
    }
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-24 z-[65] flex flex-col items-end gap-2 sm:left-auto sm:right-6 sm:w-[22rem] md:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.key} toast={toast} onDismiss={dismissToast} onOpen={open} />
        ))}
      </AnimatePresence>
    </div>
  )
}
