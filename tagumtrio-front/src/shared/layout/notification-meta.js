import {
  ArrowLeftRight,
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Inbox,
  Layers,
  Megaphone,
  Undo2,
  Wallet,
} from 'lucide-react'

// Icon + colour per notification type (types are created in the backend services).
const META = {
  daily_report_incoming: { icon: Inbox, tone: 'info' },
  daily_report_rejected: { icon: Undo2, tone: 'danger' },
  daily_report_gm_returned: { icon: Undo2, tone: 'danger' },
  daily_report_gm_pending: { icon: ClipboardCheck, tone: 'info' },
  daily_report_ready_to_compile: { icon: Layers, tone: 'info' },
  daily_report_verified: { icon: CheckCircle2, tone: 'success' },
  daily_report_approved: { icon: BadgeCheck, tone: 'success' },
  payslip_released: { icon: Wallet, tone: 'success' },
  leave_request_new: { icon: CalendarClock, tone: 'info' },
  leave_request_status: { icon: CalendarCheck, tone: 'info' },
  announcement_new: { icon: Megaphone, tone: 'info' },
  reassignment_employee: { icon: ArrowLeftRight, tone: 'warning' },
  reassignment_leadman: { icon: ArrowLeftRight, tone: 'warning' },
}

export const TONE_CLASSES = {
  info: 'bg-sky-50 text-sky-600',
  success: 'bg-emerald-50 text-emerald-600',
  danger: 'bg-rose-50 text-rose-600',
  warning: 'bg-amber-50 text-amber-600',
}

export function getNotificationMeta(type) {
  return META[type] || { icon: Bell, tone: 'info' }
}

// "just now", "5m ago", "3h ago", "2d ago", then a date.
export function timeAgo(value, now = Date.now()) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return ''
  const seconds = Math.max(0, Math.round((now - time) / 1000))
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Fired by the "N new updates" toast to open the bell panel.
export const OPEN_NOTIFICATIONS_EVENT = 'triops-open-notifications'
