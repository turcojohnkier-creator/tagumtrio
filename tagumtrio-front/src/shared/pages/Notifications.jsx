import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { fetchNotificationsApi } from '../../lib/api'
import { formatRole } from '../../lib/roles'
import {
  isNotificationSoundEnabled,
  playNotificationSound,
  setNotificationSoundEnabled,
  subscribeNotificationSound,
} from '../../lib/notificationSound'
import { TONE_CLASSES, getNotificationMeta, timeAgo } from '../layout/notification-meta'
import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import Button from '../ui/Button'
import EmptyState from '../ui/EmptyState'

// How many notifications the page loads (the 8-second poll only carries the latest 20).
const PAGE_LIMIT = 100

function byNewest(a, b) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
}

// Fold the poll's latest notifications into the page's longer list: new ones
// appear at the top and read/unread state stays in sync.
function mergeNotifications(list, latest) {
  const map = new Map(list.map((item) => [item.id, item]))
  latest.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }))
  return Array.from(map.values()).sort(byNewest)
}

export default function Notifications() {
  const { user, t } = useAuth()
  const { notifications: latest = [], unreadTotal = 0, markNotificationRead, markAllNotificationsRead } = useAppData()
  const navigate = useNavigate()
  // `fetched`: the longer list loaded once on open. `latest`: the app-wide
  // poll, so new notifications appear here without a reload.
  const [fetched, setFetched] = useState([])
  // Read marks made on this page, so older items beyond the poll's 20 update too.
  const [readIds, setReadIds] = useState(() => new Set())
  const [allReadAt, setAllReadAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [soundOn, setSoundOn] = useState(isNotificationSoundEnabled)

  useEffect(() => subscribeNotificationSound(setSoundOn), [])

  useEffect(() => {
    let cancelled = false
    fetchNotificationsApi(false, PAGE_LIMIT)
      .then((remote) => {
        if (!cancelled && Array.isArray(remote)) setFetched(remote)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const items = useMemo(() => {
    const allReadTime = allReadAt ? new Date(allReadAt).getTime() : null
    return mergeNotifications(fetched, latest).map((item) => {
      if (item.readAt) return item
      const readHere = readIds.has(item.id) || (allReadTime !== null && new Date(item.createdAt).getTime() <= allReadTime)
      return readHere ? { ...item, readAt: allReadAt || new Date().toISOString() } : item
    })
  }, [fetched, latest, readIds, allReadAt])

  function toggleSound() {
    const next = !soundOn
    setNotificationSoundEnabled(next)
    // Preview the chime when turning it on.
    if (next) playNotificationSound({ force: true })
  }

  function openNotification(item) {
    markNotificationRead?.(item)
    setReadIds((current) => new Set(current).add(item.id))
    if (item.link) navigate(item.link)
  }

  function markAllRead() {
    markAllNotificationsRead?.()
    setAllReadAt(new Date().toISOString())
  }

  const unreadItems = useMemo(() => items.filter((item) => !item.readAt), [items])
  const visible = filter === 'unread' ? unreadItems : items
  const unreadCount = Math.max(unreadTotal, unreadItems.length)

  const portalLabel = user?.role === 'employee'
    ? 'Employee Portal'
    : t(`role.${user?.role}`, formatRole(user?.role))

  const filters = [
    { key: 'all', label: t('notifications.filter_all', 'All'), count: items.length },
    { key: 'unread', label: t('notifications.filter_unread', 'Unread'), count: unreadItems.length },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow={portalLabel}
        title={t('notifications.title', 'Notifications')}
        description={unreadCount > 0
          ? `${unreadCount} ${t('notifications.unread', 'unread')}`
          : t('notifications.all_caught_up', "You're all caught up")}
      />

      <Card padding="p-0" className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1" role="tablist">
            {filters.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={filter === option.key}
                onClick={() => setFilter(option.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === option.key ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'}`}
              >
                {option.label}
                <span className="ml-1.5 text-xs text-zinc-400">{option.count}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSound}
              aria-pressed={soundOn}
              title={soundOn ? t('notifications.sound_off', 'Turn notification sound off') : t('notifications.sound_on', 'Turn notification sound on')}
            >
              {soundOn ? <Volume2 className="h-4 w-4 text-emerald-700" /> : <VolumeX className="h-4 w-4 text-zinc-400" />}
              <span>{soundOn ? t('notifications.sound_label_on', 'Sound on') : t('notifications.sound_label_off', 'Sound off')}</span>
            </Button>
            <Button variant="successOutline" size="sm" onClick={markAllRead} disabled={unreadItems.length === 0 && unreadTotal === 0}>
              <CheckCheck className="h-4 w-4" />
              {t('notifications.mark_all_read', 'Mark all as read')}
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Bell}
              title={loading
                ? t('notifications.loading', 'Loading notifications...')
                : filter === 'unread'
                  ? t('notifications.all_caught_up', "You're all caught up")
                  : t('notifications.empty_title', 'No notifications yet')}
              description={loading ? null : t('notifications.empty_desc', 'Updates about your reports and requests will show up here.')}
            />
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visible.map((item) => {
              const { icon: Icon, tone } = getNotificationMeta(item.type)
              const unread = !item.readAt
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(item)}
                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-zinc-50 sm:px-5 ${unread ? 'bg-emerald-50/40' : ''}`}
                  >
                    <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone] || TONE_CLASSES.info}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className={`text-sm ${unread ? 'font-semibold text-zinc-900' : 'font-medium text-zinc-700'}`}>{item.title}</span>
                        <span className="shrink-0 text-xs text-zinc-400" title={new Date(item.createdAt).toLocaleString()}>{timeAgo(item.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-500">{item.message}</span>
                    </span>
                    {unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label={t('notifications.unread', 'unread')} /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
