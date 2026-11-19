import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Coins, History, Hourglass,
  Package, Search, Send, Wallet, X, XCircle,
} from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { fetchReportHistoryApi } from '../../lib/api'
import useLiveRefresh from '../hooks/useLiveRefresh'
import {
  addDays, formatDateKey, formatRangeLabel, getRange, shiftAnchor, toManilaDateKey,
} from '../../lib/datetime'
import ReportCalendar from '../ui/ReportCalendar'
import { formatProductWithUnit } from '../../lib/units'
import { groupBatches, hasMeaningfulEntry } from '../reports/report-entry-utils'
import { getStatusLabel, getStatusVariant, normalizeStatus } from '../reports/report-status'
import DailyReportTable from '../reports/DailyReportTable'
import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import StatCard from '../ui/StatCard'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import UserAvatar from '../ui/UserAvatar'
import Portal from '../ui/Portal'

function peso(value) {
  return `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function uniqueJoined(values) {
  const list = Array.from(new Set(values.map((v) => String(v || '').trim()).filter(Boolean)))
  return list.length ? list.join(', ') : '—'
}

// Flatten a report into the numbers the history cards and stats need.
function summarizeReport(report) {
  const entries = (Array.isArray(report.entries) ? report.entries : []).filter(hasMeaningfulEntry)
  const fallbackDepartment = report.department || ''
  const departments = entries.map((entry) => entry.department || entry.raw?.department || fallbackDepartment)
  const products = entries
    .map((entry) => {
      const product = entry.product || entry.raw?.product
      if (!product) return ''
      return formatProductWithUnit(product, entry.department || entry.raw?.department || fallbackDepartment)
    })
  // Quantity is shared by every worker in a batch, so count it once per batch.
  const totalPieces = groupBatches(entries, fallbackDepartment).reduce((sum, batch) => sum + batch.quantity, 0)
  const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

  return {
    ...report,
    status: normalizeStatus(report.status),
    entries,
    workType: uniqueJoined(departments.length ? departments : [fallbackDepartment]),
    productLabel: uniqueJoined(products),
    totalPieces,
    totalAmount,
    employeeCount: new Set(entries.map((entry) => String(entry.employeeId || entry.employeeName || entry.id || ''))).size,
  }
}

const ROLE_CONFIG = {
  employee: {
    title: 'My Work History',
    description: 'Every report you were part of — the work you did, the products, and the income it earned you.',
    emptyText: 'Once your leadman reports work you took part in, it will show up here.',
    activityLabel: () => 'Reported',
    activityDate: (r) => r.createdAt,
    amountLabel: (r) => (r.status === 'approved' ? 'Income earned' : 'Income (pending)'),
    stats: (reports) => {
      const earned = reports.filter((r) => r.status === 'approved').reduce((s, r) => s + r.totalAmount, 0)
      const pending = reports.filter((r) => r.status !== 'approved').reduce((s, r) => s + r.totalAmount, 0)
      return [
        { label: 'Reports worked', value: reports.length, icon: ClipboardList },
        { label: 'Total pieces', value: reports.reduce((s, r) => s + r.totalPieces, 0).toLocaleString(), icon: Package },
        { label: 'Income earned', value: peso(earned), hint: 'Approved by GM', icon: Wallet, highlight: true },
        { label: 'Pending income', value: peso(pending), hint: 'Awaiting approval', icon: Hourglass },
      ]
    },
  },
  // A leadman's history has two kinds of report (see `involvement`, set on
  // load): ones they SUBMITTED to the next department, and incoming ones they
  // VERIFIED or rejected for their own department.
  leadman: {
    title: 'My Report Activity',
    description: 'Reports you submitted to the next department, and incoming reports you verified or rejected.',
    emptyText: 'Reports you submit, verify or reject will show up here.',
    hasInvolvementFilter: true,
    activityLabel: (r) => {
      if (r.involvement !== 'verified') return 'Submitted'
      return r.status === 'rejected' ? 'You rejected' : 'You verified'
    },
    activityDate: (r) => (r.involvement === 'verified' ? (r.verifiedAt || r.createdAt) : r.createdAt),
    amountLabel: () => 'Total amount',
    stats: (reports) => {
      const submitted = reports.filter((r) => r.involvement === 'submitted')
      const reviewed = reports.filter((r) => r.involvement === 'verified')
      return [
        { label: 'Submitted', value: submitted.length, icon: Send },
        { label: 'Returned to me', value: submitted.filter((r) => r.status === 'rejected' || r.status === 'returned').length, icon: XCircle },
        { label: 'Verified by me', value: reviewed.filter((r) => r.status !== 'rejected').length, icon: CheckCircle2, highlight: true },
        { label: 'Rejected by me', value: reviewed.filter((r) => r.status === 'rejected').length, icon: XCircle },
      ]
    },
  },
  production_incharge: {
    title: 'Reports I Validated',
    description: 'Reports you compiled, and whether they have been sent to and approved by the GM.',
    emptyText: 'Reports you compile from the Production dashboard will show up here.',
    activityLabel: () => 'Compiled',
    activityDate: (r) => r.compiledAt || r.createdAt,
    amountLabel: () => 'Total amount',
    stats: (reports) => [
      { label: 'Compiled', value: reports.length, icon: ClipboardList },
      { label: 'Sent to GM', value: reports.filter((r) => r.status === 'gm_submitted').length, icon: Send },
      { label: 'Approved', value: reports.filter((r) => r.status === 'approved').length, icon: CheckCircle2 },
      { label: 'Total amount', value: peso(reports.reduce((s, r) => s + r.totalAmount, 0)), icon: Coins, highlight: true },
    ],
  },
  gm: {
    title: 'Reports I Approved',
    description: 'Reports you approved and the payroll each one released.',
    emptyText: 'Reports you approve from Consolidated Reports will show up here.',
    activityLabel: () => 'Approved',
    activityDate: (r) => r.approvedAt || r.createdAt,
    amountLabel: () => 'Payroll released',
    stats: (reports) => [
      { label: 'Reports approved', value: reports.length, icon: CheckCircle2 },
      { label: 'Employees paid', value: reports.reduce((s, r) => s + r.employeeCount, 0), icon: ClipboardList },
      { label: 'Total pieces', value: reports.reduce((s, r) => s + r.totalPieces, 0).toLocaleString(), icon: Package },
      { label: 'Payroll released', value: peso(reports.reduce((s, r) => s + r.totalAmount, 0)), icon: Wallet, highlight: true },
    ],
  },
}

const inputClass = 'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300/40'

function DetailRow({ label, children }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <p className="text-[11px] text-zinc-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-zinc-900">{children}</div>
    </div>
  )
}

function HistoryDetailModal({ report, config, isEmployee, formatDateTime, onClose }) {
  if (!report) return null
  return (
    <Portal>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4" onClick={onClose}>
        <div className="flex min-h-full items-center justify-center py-8">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white shadow-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">{isEmployee ? 'Your work in this report' : 'Report details'}</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{report.department} • {report.reportDate}</h3>
                <div className="mt-2"><Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge></div>
              </div>
              <button type="button" onClick={onClose} className="btn-dismiss rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 hover:bg-zinc-100" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DetailRow label="Type of work">{report.workType}</DetailRow>
                <DetailRow label="Product">{report.productLabel}</DetailRow>
                <DetailRow label="Quantity">{report.totalPieces.toLocaleString()}</DetailRow>
                <DetailRow label={config.amountLabel(report)}><span className="text-emerald-700">{peso(report.totalAmount)}</span></DetailRow>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Submitted by">
                  <span className="flex items-center gap-2">
                    <UserAvatar userId={report.submittedBy} name={report.submittedByName} size="xs" />
                    {report.submittedByName || 'Unknown'}
                  </span>
                </DetailRow>
                <DetailRow label={config.activityLabel(report)}>{formatDateTime(config.activityDate(report))}</DetailRow>
              </div>
              <DailyReportTable entries={report.entries} fallbackDepartment={report.department} fallbackDate={report.reportDate} />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

const VIEW_MODES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
]
const MODE_STORAGE_KEY = 'tagum_history_view_mode'

function readStoredMode() {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY)
    return VIEW_MODES.some((m) => m.key === stored) ? stored : 'day'
  } catch {
    return 'day'
  }
}

function workDateKey(report) {
  return String(report.reportDate || '').slice(0, 10)
}

const chipClass = 'inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40'

function HistoryReportCard({ report, config, isEmployee, showDate, formatDateTime, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-lg border border-zinc-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="xl:flex xl:items-center xl:gap-5">
        <div className="min-w-0 xl:w-52 xl:shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {showDate ? <h4 className="font-heading text-base font-bold text-zinc-900">{formatDateKey(workDateKey(report), 'short')}</h4> : null}
            <Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{config.activityLabel(report)} {formatDateTime(config.activityDate(report))}</p>
          {config.hasInvolvementFilter && report.involvement === 'verified' ? (
            <p className="mt-0.5 text-xs text-zinc-400">From {report.department} • by {report.submittedByName || 'Unknown'}</p>
          ) : null}
        </div>

        <div className="mt-3 grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 xl:mt-0">
          <DetailRow label="Type of work"><span className="block truncate">{report.workType}</span></DetailRow>
          <DetailRow label="Product"><span className="block truncate">{report.productLabel}</span></DetailRow>
          <DetailRow label="Quantity">{report.totalPieces.toLocaleString()}</DetailRow>
          <DetailRow label={config.amountLabel(report)}>
            <span className={report.status === 'approved' || !isEmployee ? 'text-emerald-700' : 'text-amber-600'}>{peso(report.totalAmount)}</span>
          </DetailRow>
        </div>

        <span className="mt-3 flex items-center justify-end gap-1 text-xs text-emerald-600 group-hover:text-emerald-700 xl:mt-0">
          View <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}

// Notification types that mean "your history changed" for each role.
const HISTORY_REFRESH_TYPES = {
  leadman: ['daily_report_verified', 'daily_report_approved', 'daily_report_rejected', 'daily_report_incoming'],
  employee: ['payslip_released'],
  production_incharge: ['daily_report_gm_returned', 'daily_report_ready_to_compile'],
  gm: ['daily_report_gm_pending'],
}
// Types whose red dot lives on the History nav item (cleared on visit).
const HISTORY_SEEN_TYPES = {
  leadman: ['daily_report_verified', 'daily_report_approved'],
}

export default function ReportHistory() {
  const { user } = useAuth()
  const { formatDateTime, markNotificationsSeen } = useAppData()
  const role = user?.role
  const config = ROLE_CONFIG[role]
  const isEmployee = role === 'employee'
  const todayKey = toManilaDateKey()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [involvement, setInvolvement] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setModeState] = useState(readStoredMode)
  // null until the user picks a date — until then we follow the latest day
  // that has reports, so the page never opens on an empty day.
  const [pickedKey, setPickedKey] = useState(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const toHistoryRows = (data) => {
    const myId = String(user?.id ?? '')
    return (Array.isArray(data) ? data : []).map((report) => ({
      ...summarizeReport(report),
      // Only meaningful for leadmen: did I review this report, or send it?
      involvement: myId && String(report.verifiedBy ?? '') === myId ? 'verified' : 'submitted',
    }))
  }

  useEffect(() => {
    if (!config) return undefined
    let cancelled = false
    fetchReportHistoryApi({ limit: 500 })
      .then((data) => { if (!cancelled) setReports(toHistoryRows(data)) })
      .catch((err) => { if (!cancelled) { setReports([]); setError(err?.message || 'Unable to load your history.') } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, user?.id])

  // Clear this page's red dot (leadman History), then keep the list fresh in the
  // background — a failed background refresh keeps what is already shown.
  useEffect(() => {
    HISTORY_SEEN_TYPES[role]?.forEach((type) => markNotificationsSeen(type))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])
  useLiveRefresh(
    () => fetchReportHistoryApi({ limit: 500 }).then((data) => setReports(toHistoryRows(data))).catch(() => {}),
    { types: HISTORY_REFRESH_TYPES[role] || [], clearTypes: HISTORY_SEEN_TYPES[role] || [], intervalMs: 60000, enabled: Boolean(config) }
  )

  function setMode(next) {
    setModeState(next)
    try { window.localStorage.setItem(MODE_STORAGE_KEY, next) } catch { /* storage unavailable */ }
  }

  // Stage 1: every filter except the date. The calendar markers come from
  // this, so they always agree with the search/status filters.
  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reports.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (involvement !== 'all' && r.involvement !== involvement) return false
      if (!q) return true
      return [r.id, r.department, r.workType, r.productLabel, r.submittedByName, r.reportDate]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    })
  }, [reports, query, status, involvement])

  const markers = useMemo(() => {
    const map = {}
    baseFiltered.forEach((r) => {
      const key = workDateKey(r)
      if (!key) return
      if (!map[key]) map[key] = { count: 0, amount: 0 }
      map[key].count += 1
      map[key].amount += r.totalAmount
    })
    return map
  }, [baseFiltered])

  const markedDays = useMemo(() => Object.keys(markers).sort(), [markers])
  const latestDay = markedDays[markedDays.length - 1] || null
  const anchorKey = pickedKey || latestDay || todayKey
  const range = useMemo(() => getRange(mode, anchorKey), [mode, anchorKey])

  // Stage 2: narrow to the selected day / week / month (by work date).
  const visible = useMemo(
    () => baseFiltered.filter((r) => {
      const key = workDateKey(r)
      return key >= range.start && key <= range.end
    }),
    [baseFiltered, range]
  )

  // Week/month views group the list by day, newest day first.
  const dayGroups = useMemo(() => {
    const groups = new Map()
    visible.forEach((r) => {
      const key = workDateKey(r)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(r)
    })
    return Array.from(groups.entries())
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([key, items]) => ({ key, items, amount: items.reduce((s, r) => s + r.totalAmount, 0) }))
  }, [visible])

  const stats = useMemo(() => (config ? config.stats(visible) : []), [config, visible])
  const statusOptions = useMemo(() => Array.from(new Set(reports.map((r) => r.status).filter(Boolean))), [reports])
  const selected = useMemo(() => reports.find((r) => r.id === selectedId) || null, [reports, selectedId])

  // Nearest days with reports outside the current range, for the empty state.
  const previousDay = useMemo(() => [...markedDays].reverse().find((key) => key < range.start) || null, [markedDays, range])
  const nextDay = useMemo(() => markedDays.find((key) => key > range.end) || null, [markedDays, range])

  if (!config) {
    return <EmptyState title="History unavailable" description="Your role does not take part in production reporting." />
  }

  const hasFilters = query || status !== 'all' || involvement !== 'all'
  const rangeLabel = formatRangeLabel(mode, range)
  const goTo = (key, nextMode) => {
    if (nextMode) setMode(nextMode)
    setPickedKey(key)
  }

  const quickJumps = (
    <>
      <button type="button" className={chipClass} onClick={() => goTo(todayKey, 'day')}>Today</button>
      <button type="button" className={chipClass} onClick={() => goTo(addDays(todayKey, -1), 'day')}>Yesterday</button>
      <button type="button" className={chipClass} disabled={!latestDay} onClick={() => goTo(latestDay, 'day')}>
        <History className="h-3.5 w-3.5" /> Latest with reports
      </button>
    </>
  )

  const modeToggle = (
    <div className="grid grid-cols-3 rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-sm" role="group" aria-label="View by">
      {VIEW_MODES.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => setMode(option.key)}
          aria-pressed={mode === option.key}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${mode === option.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )

  const calendar = (
    <ReportCalendar
      anchorKey={anchorKey}
      mode={mode}
      markers={markers}
      todayKey={todayKey}
      onSelect={(key) => setPickedKey(key)}
    />
  )

  return (
    <div className="space-y-6">
      <PageHeader tone="brand" eyebrow="History" title={config.title} description={config.description} />

      <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* ---- Left: calendar (desktop) ---- */}
        <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
          <Card className="space-y-4">
            {modeToggle}
            {calendar}
          </Card>
          <div className="flex flex-wrap gap-2">{quickJumps}</div>
        </aside>

        {/* ---- Right: selected period ---- */}
        <div className="min-w-0 space-y-4">
          {/* Mobile date bar + collapsible calendar */}
          <Card className="space-y-3 lg:hidden">
            {modeToggle}
            <div className="flex items-center justify-between gap-2">
              <button type="button" aria-label="Previous" onClick={() => setPickedKey(shiftAnchor(mode, anchorKey, -1))} className="rounded-md border border-zinc-200 p-2 text-zinc-600">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setCalendarOpen((open) => !open)} className="flex min-w-0 items-center gap-2 text-sm font-semibold text-zinc-900">
                <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">{rangeLabel}</span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${calendarOpen ? 'rotate-180' : ''}`} />
              </button>
              <button type="button" aria-label="Next" onClick={() => setPickedKey(shiftAnchor(mode, anchorKey, 1))} className="rounded-md border border-zinc-200 p-2 text-zinc-600">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {calendarOpen ? calendar : null}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{quickJumps}</div>
          </Card>

          {/* Period heading (desktop) */}
          <div className="hidden items-center justify-between gap-3 lg:flex">
            <div>
              <h2 className="font-heading text-xl font-bold text-zinc-900">{rangeLabel}</h2>
              <p className="text-sm text-zinc-500">{visible.length} report{visible.length === 1 ? '' : 's'}{mode !== 'day' ? ` across ${dayGroups.length} day${dayGroups.length === 1 ? '' : 's'}` : ''}</p>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label={`Previous ${mode}`} onClick={() => setPickedKey(shiftAnchor(mode, anchorKey, -1))} className="rounded-md border border-zinc-200 bg-white p-2 text-zinc-600 hover:text-zinc-900">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label={`Next ${mode}`} onClick={() => setPickedKey(shiftAnchor(mode, anchorKey, 1))} className="rounded-md border border-zinc-200 bg-white p-2 text-zinc-600 hover:text-zinc-900">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </div>

          <Card className="space-y-4">
            {config.hasInvolvementFilter ? (
              <div className="inline-flex flex-wrap rounded-lg border border-zinc-200 bg-zinc-50 p-1 text-sm">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'submitted', label: 'Submitted by me' },
                  { key: 'verified', label: 'Verified by me' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setInvolvement(option.key)}
                    className={`rounded-md px-3 py-1.5 font-medium transition-colors ${involvement === option.key ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search work, product, report ID..." className={`${inputClass} pl-10`} />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="all">All statuses</option>
                {statusOptions.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => { setQuery(''); setStatus('all'); setInvolvement('all') }}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                Clear filters
              </button>
            ) : null}

            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            {loading ? <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading your history...</div> : null}

            {!loading && !error && visible.length === 0 ? (
              <div className="space-y-3 rounded-xl border border-dashed border-zinc-200 px-4 py-8 text-center">
                <p className="font-semibold text-zinc-800">
                  {reports.length === 0 ? 'No history yet' : `No reports ${mode === 'day' ? `on ${formatDateKey(anchorKey, 'monthDay')}` : `in ${rangeLabel}`}`}
                </p>
                <p className="text-sm text-zinc-500">
                  {reports.length === 0 ? config.emptyText : hasFilters ? 'Nothing matches your filters for this period.' : 'Pick a highlighted day on the calendar, or jump to a nearby one.'}
                </p>
                {previousDay || nextDay ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {previousDay ? (
                      <button type="button" className={chipClass} onClick={() => goTo(previousDay, 'day')}>
                        <ChevronLeft className="h-3.5 w-3.5" /> {formatDateKey(previousDay, 'short')}
                      </button>
                    ) : null}
                    {nextDay ? (
                      <button type="button" className={chipClass} onClick={() => goTo(nextDay, 'day')}>
                        {formatDateKey(nextDay, 'short')} <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!loading && visible.length > 0 ? (
              mode === 'day' ? (
                <motion.div className="space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
                  {visible.map((report) => (
                    <motion.div key={report.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}>
                      <HistoryReportCard report={report} config={config} isEmployee={isEmployee} showDate={false} formatDateTime={formatDateTime} onOpen={() => setSelectedId(report.id)} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="space-y-5">
                  {dayGroups.map((group) => (
                    <section key={group.key} className="space-y-2">
                      <button
                        type="button"
                        onClick={() => goTo(group.key, 'day')}
                        className="sticky top-0 z-10 flex w-full items-center justify-between rounded-lg bg-zinc-100/95 px-3 py-2 text-left text-sm backdrop-blur hover:bg-zinc-200/80"
                        title="Open this day"
                      >
                        <span className="font-semibold text-zinc-900">{formatDateKey(group.key, 'short')}</span>
                        <span className="text-xs text-zinc-500">{group.items.length} report{group.items.length === 1 ? '' : 's'} · <span className="font-semibold text-emerald-700">{peso(group.amount)}</span></span>
                      </button>
                      {group.items.map((report) => (
                        <HistoryReportCard key={report.id} report={report} config={config} isEmployee={isEmployee} showDate={false} formatDateTime={formatDateTime} onOpen={() => setSelectedId(report.id)} />
                      ))}
                    </section>
                  ))}
                </div>
              )
            ) : null}
          </Card>
        </div>
      </div>

      <HistoryDetailModal
        report={selected}
        config={config}
        isEmployee={isEmployee}
        formatDateTime={formatDateTime}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
