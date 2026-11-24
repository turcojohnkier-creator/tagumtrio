import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Inbox, Pencil, Undo2, Users, X,
} from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { fetchDailyReportsApi, updateDailyReportApi } from '../../../lib/api'
import { formatProductWithUnit } from '../../../lib/units'
import { extractNote, groupBatches, summarizeBatches } from '../../../shared/reports/report-entry-utils'
import ReportEntryForm from '../components/ReportEntryForm'
import ReturnTrail from '../../../shared/reports/ReturnTrail'
import PageHeader from '../../../shared/ui/PageHeader'
import Button from '../../../shared/ui/Button'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'
import UserAvatar from '../../../shared/ui/UserAvatar'
import ProfileLink from '../../../shared/profile/ProfileLink'
import Portal from '../../../shared/ui/Portal'
import { toManilaDateKey } from '../../../lib/datetime'
import useLiveRefresh from '../../../shared/hooks/useLiveRefresh'

function fallbackFormatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function formatWorkDate(value) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function peso(value) {
  return `₱${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function getStatusLabel(status) {
  switch (normalizeText(status)) {
    case 'submitted':
      return 'Awaiting your verification'
    case 'leadman_verified':
      return 'Verified by you'
    case 'gm_submitted':
      return 'Forwarded to GM'
    case 'rejected':
      return 'Rejected'
    case 'returned':
      return 'Returned by Production In-Charge'
    default:
      return status || 'Unknown'
  }
}

function getStatusVariant(status) {
  switch (normalizeText(status)) {
    case 'leadman_verified':
      return 'success'
    case 'gm_submitted':
      return 'info'
    case 'rejected':
    case 'returned':
      return 'danger'
    default:
      return 'warning'
  }
}

// Batches + totals + the human-written note, derived once per report.
function useReportView(report) {
  return useMemo(() => {
    const batches = groupBatches(report.entries, report.department, report.reportDate)
    return { batches, ...summarizeBatches(batches), note: extractNote(report.summary) }
  }, [report.entries, report.department, report.reportDate, report.summary])
}

function buildEntriesFromPayloads(payloads, batchCapturedAt) {
  return payloads.map((payload) => ({
    id: `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    employeeId: payload.employeeId,
    employeeName: payload.employeeName,
    department: payload.department,
    product: payload.product,
    quantity: payload.quantity,
    pricePerUnit: payload.pricePerUnit,
    amount: payload.amount,
    photos: payload.photos,
    notes: payload.notes,
    date: payload.qrFields?.date || payload.date || undefined,
    scannedAt: batchCapturedAt,
    batchId: payload.batchId,
  }))
}

/* ---------- the report table ---------- */

// Leadmen can attach any number of photos, so the cell has a fixed footprint:
// a 2×2 grid. Up to 4 photos show as-is; with 5+ the 4th tile becomes "+N"
// and opens the viewer, where every photo can be browsed.
const MAX_THUMB_TILES = 4

function PhotoThumbs({ photos, onOpen }) {
  if (!photos.length) return <span className="text-xs text-zinc-400">None</span>
  const overflow = photos.length > MAX_THUMB_TILES
  const shown = overflow ? photos.slice(0, MAX_THUMB_TILES - 1) : photos
  const tile = 'h-11 w-11 overflow-hidden rounded-md border focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="grid w-max grid-cols-2 gap-1.5">
      {shown.map((photo, index) => (
        <button
          key={`${photo.label}-${index}`}
          type="button"
          onClick={() => onOpen(photos, index)}
          title={`${photo.label} — click to enlarge`}
          className={`group relative border-zinc-200 bg-zinc-100 ${tile}`}
        >
          <img src={photo.src} alt={photo.label} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
          <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-0.5 text-center text-[9px] font-medium leading-tight text-white">{photo.label}</span>
        </button>
      ))}
      {overflow ? (
        <button
          type="button"
          onClick={() => onOpen(photos, MAX_THUMB_TILES - 1)}
          title={`View all ${photos.length} photos`}
          className={`relative flex items-center justify-center border-zinc-300 bg-zinc-800 text-white ${tile}`}
        >
          <img src={photos[MAX_THUMB_TILES - 1].src} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <span className="relative text-xs font-bold">+{photos.length - (MAX_THUMB_TILES - 1)}</span>
        </button>
      ) : null}
    </div>
  )
}

// A batch can have many workers, so the cell shows only a count; the full
// list opens in a popup. Module scope so its open state survives polling.
function WorkersButton({ workers, title }) {
  const [open, setOpen] = useState(false)
  const count = workers.length

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (count === 0) return <span className="text-xs text-zinc-400">None</span>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`View ${count} employee${count === 1 ? '' : 's'}`}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Users className="h-4 w-4" />
        <span className="tabular-nums">{count}</span>
      </button>

      {open ? (
        <Portal>
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Employees in this batch"
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-xl border border-zinc-200 bg-white shadow-lg"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-heading text-base font-bold text-zinc-900">{title}</p>
                  <p className="text-xs text-zinc-500">{count} employee{count === 1 ? '' : 's'}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="btn-dismiss rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="divide-y divide-zinc-100 overflow-y-auto px-4 py-1">
                {workers.map((worker, workerIndex) => (
                  <li key={`${worker.id ?? worker.name}-${workerIndex}`} className="flex items-center justify-between gap-3 py-2">
                    <ProfileLink userId={worker.id} name={worker.name} className="flex min-w-0 items-center gap-2">
                      <UserAvatar userId={worker.id} name={worker.name} size="xs" />
                      <span className="truncate text-sm font-medium text-zinc-800">{worker.name || 'Unknown'}</span>
                    </ProfileLink>
                    {worker.identifier ? <span className="shrink-0 text-xs text-zinc-400">{worker.identifier}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Portal>
      ) : null}
    </>
  )
}

// Same look and column order as the system's daily report table, plus a
// worker count (list in a popup), the proof photos visible, and a totals row.
function VerificationTable({ view, onOpenPhotos }) {
  const { t } = useAuth()
  const th = 'px-4 py-3 font-medium whitespace-nowrap'

  if (view.batches.length === 0) {
    return <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-zinc-500">{t('table.no_entries', 'No entries in this report.')}</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-emerald-50/70 text-emerald-800">
          <tr>
            <th className={th}>{t('table.department', 'Department')}</th>
            <th className={th}>{t('table.product', 'Product')}</th>
            <th className={`${th} text-right`}>{t('table.quantity', 'Quantity')}</th>
            <th className={th}>{t('table.date', 'Date')}</th>
            <th className={th}>{t('table.employees', 'Employees')}</th>
            <th className={th}>{t('table.photos', 'Photos')}</th>
            <th className={`${th} text-right`}>{t('table.amount', 'Amount')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white align-top">
          {view.batches.map((batch, index) => (
            <tr key={batch.key} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
              <td className="px-4 py-3 whitespace-nowrap">{batch.department || '—'}</td>
              <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">{formatProductWithUnit(batch.product, batch.department) || '—'}</td>
              <td className="px-4 py-3 text-right font-heading text-base font-bold tabular-nums text-zinc-900">{batch.quantity.toLocaleString()}</td>
              <td className="px-4 py-3 whitespace-nowrap">{batch.date ? formatWorkDate(batch.date) : '—'}</td>
              <td className="px-4 py-3">
                <WorkersButton
                  workers={batch.workers}
                  title={formatProductWithUnit(batch.product, batch.department) || batch.department || t('table.employees', 'Employees')}
                />
              </td>
              <td className="px-4 py-3"><PhotoThumbs photos={batch.photos} onOpen={onOpenPhotos} /></td>
              <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">{peso(batch.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 text-zinc-900">
          <tr>
            <td className="px-4 py-3 font-semibold" colSpan={2}>Total ({view.batchCount} batch{view.batchCount === 1 ? '' : 'es'})</td>
            <td className="px-4 py-3 text-right font-heading text-base font-bold tabular-nums">{view.totalQuantity.toLocaleString()}</td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 font-semibold">{view.workerCount} worker{view.workerCount === 1 ? '' : 's'}</td>
            <td className="px-4 py-3 text-zinc-500">{view.photos.length} photo{view.photos.length === 1 ? '' : 's'}</td>
            <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">{peso(view.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function ReportHeading({ report, toDepartment, formatDT }) {
  return (
    <div className="min-w-0">
      <h3 className="flex flex-wrap items-center gap-2 font-heading text-lg font-bold text-zinc-900">
        <span>{report.department || 'Unknown department'}</span>
        <ArrowRight className="h-4 w-4 text-zinc-400" />
        <span className="text-zinc-500">{toDepartment || 'Next department'}</span>
      </h3>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500">
        <span className="font-medium text-zinc-700">Work date {formatWorkDate(report.reportDate)}</span>
        <span className="text-zinc-300">•</span>
        <ProfileLink userId={report.submittedBy} name={report.submittedByName} className="inline-flex items-center gap-1.5">
          <UserAvatar userId={report.submittedBy} name={report.submittedByName} size="xs" />
          {report.submittedByName || 'Unknown leadman'}
        </ProfileLink>
        <span className="text-zinc-300">•</span>
        <span>Sent {formatDT(report.createdAt || report.reportDate)}</span>
      </p>
    </div>
  )
}

/* ---------- incoming / verified report ---------- */

// Module scope (not inside the page) so React keeps the same component across
// the page's 5s polling re-renders — the reject note lives in local state here,
// so typing never loses focus.
function IncomingReport({ report, currentDepartment, busy, onVerify, onReject, onOpenPhotos, formatDT }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const view = useReportView(report)
  const isPending = normalizeText(report.status) === 'submitted'

  return (
    <div className={`space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${isPending ? 'border-amber-200' : 'border-zinc-200'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <ReportHeading report={report} toDepartment={report.targetDepartment || currentDepartment} formatDT={formatDT} />
        {isPending ? (
          !rejecting ? (
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" className="btn-dismiss" disabled={busy} onClick={() => setRejecting(true)}>
                <CircleAlert className="h-4 w-4" />
                Reject
              </Button>
              <Button type="button" disabled={busy} onClick={() => onVerify(report, '')}>
                <Check className="h-4 w-4" />
                {busy ? 'Updating…' : 'Verify report'}
              </Button>
            </div>
          ) : null
        ) : (
          <Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge>
        )}
      </div>

      {view.note ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          <span className="font-semibold">Note:</span> {view.note}
        </div>
      ) : null}

      <VerificationTable view={view} onOpenPhotos={onOpenPhotos} />

      {isPending && rejecting ? (
        <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/60 p-4">
          <label htmlFor={`reject-${report.id}`} className="text-sm font-semibold text-rose-800">
            Why are you rejecting this report?
          </label>
          <textarea
            id={`reject-${report.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Quantity received was 10, not 12. Please recount and resubmit."
            autoFocus
            className="min-h-[88px] w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-rose-400"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="btn-dismiss" onClick={() => { setRejecting(false); setNote('') }}>Cancel</Button>
            <Button type="button" variant="danger" disabled={busy || !note.trim()} onClick={() => onReject(report, note.trim())}>
              <CircleAlert className="h-4 w-4" />
              {busy ? 'Updating…' : 'Send back to leadman'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/* ---------- reports this leadman sent that came back rejected ---------- */

function ReturnedReport({ report, formatDT, onEdit, onOpenPhotos }) {
  const view = useReportView(report)
  const returnedByProduction = normalizeText(report.status) === 'returned'
  return (
    <div className="space-y-4 rounded-xl border border-rose-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <ReportHeading report={report} toDepartment={report.targetDepartment} formatDT={formatDT} />
        <Button className="shrink-0" onClick={() => onEdit(report)}>
          <Pencil className="h-4 w-4" />
          Edit & resubmit
        </Button>
      </div>

      {returnedByProduction ? (
        // Production in-charge's reason first, then the GM's that started it.
        <ReturnTrail report={report} />
      ) : (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600">Reason from {report.targetDepartment || 'the next department'}</p>
          <p className="mt-1 text-sm font-medium text-rose-900">{view.note || 'No reason was given.'}</p>
        </div>
      )}

      <VerificationTable view={view} onOpenPhotos={onOpenPhotos} />
    </div>
  )
}

/* ---------- modals ---------- */

function PhotoViewer({ photos, index, onChange, onClose }) {
  const photo = photos[index]
  const activeThumbRef = useRef(null)

  // Keep the current photo's thumbnail visible as the leadman steps through a long set.
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') onChange((index + 1) % photos.length)
      if (event.key === 'ArrowLeft') onChange((index - 1 + photos.length) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onChange, onClose])

  if (!photo) return null
  const many = photos.length > 1

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex flex-col bg-black/85 p-4" onClick={onClose}>
        <div className="flex items-center justify-between text-white" onClick={(event) => event.stopPropagation()}>
          <p className="text-sm font-semibold">{photo.label} <span className="font-normal text-white/60">· {index + 1} of {photos.length}</span></p>
          <button type="button" onClick={onClose} aria-label="Close photos" className="btn-dismiss btn-dismiss-dark rounded-full bg-white/10 p-2 hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center py-4">
          {many ? (
            <button type="button" aria-label="Previous photo" onClick={(event) => { event.stopPropagation(); onChange((index - 1 + photos.length) % photos.length) }} className="absolute left-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <ChevronLeft className="h-6 w-6" />
            </button>
          ) : null}
          <img src={photo.src} alt={photo.label} onClick={(event) => event.stopPropagation()} className="max-h-full max-w-full rounded-lg object-contain" />
          {many ? (
            <button type="button" aria-label="Next photo" onClick={(event) => { event.stopPropagation(); onChange((index + 1) % photos.length) }} className="absolute right-0 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <ChevronRight className="h-6 w-6" />
            </button>
          ) : null}
        </div>
        {many ? (
          // Scrollable strip for any number of photos. `mx-auto w-max` centers
          // a short strip but, unlike justify-center, never clips the first
          // thumbnails off-screen when the strip is wider than the viewport.
          <div className="overflow-x-auto pb-1" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto flex w-max gap-2">
              {photos.map((item, itemIndex) => (
                <button
                  key={`${item.label}-${itemIndex}`}
                  ref={itemIndex === index ? activeThumbRef : null}
                  type="button"
                  onClick={() => onChange(itemIndex)}
                  title={item.label}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 ${itemIndex === index ? 'border-emerald-400' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={item.src} alt={item.label} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Portal>
  )
}

function HeaderCounter({ icon: Icon, label, value, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${active ? 'border-white/60 bg-white/25' : 'border-white/20 bg-white/10 hover:bg-white/15'}`}
    >
      <Icon className="h-5 w-5 text-emerald-50" />
      <div>
        <p className="font-heading text-xl font-bold leading-none text-white tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-emerald-50/90">{label}</p>
      </div>
    </button>
  )
}

/* ---------- page ---------- */

export default function LeadmanIncomingReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const {
    selectedLeadmanDepartment, setSelectedLeadmanDepartment, formatDateTime: formatProviderDateTime,
    markNotificationsSeen, notificationCounts, employees = [], resubmitDailyReport,
  } = useAppData()

  useEffect(() => {
    markNotificationsSeen('daily_report_incoming')
  }, [])

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const currentDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''

  const [activeTab, setActiveTab] = useState('incoming')
  const [reports, setReports] = useState([])
  // Reports waiting in the leadman's *other* departments: { department: count }.
  const [otherWaiting, setOtherWaiting] = useState({})
  const [myRejectedReports, setMyRejectedReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoViewer, setPhotoViewer] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [resubmitting, setResubmitting] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Notifications link here with ?department=…&tab=… so a leadman handling
  // several departments lands on the one the report is actually for.
  useEffect(() => {
    const wantedDepartment = searchParams.get('department')
    const wantedTab = searchParams.get('tab')
    if (!wantedDepartment && !wantedTab) return
    const match = assignedDepartments.find((name) => normalizeText(name) === normalizeText(wantedDepartment))
    if (match) setSelectedLeadmanDepartment(match)
    if (wantedTab === 'incoming' || wantedTab === 'rejected') {
      // One-time sync from the notification link; the params are cleared below.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(wantedTab)
      if (wantedTab === 'rejected') markNotificationsSeen('daily_report_rejected')
    }
    // Drop the params so the department dropdown works normally afterwards.
    setSearchParams({}, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, assignedDepartments])

  // Every department this leadman receives for, so nothing waits unseen in a
  // department that isn't selected right now.
  const loadReports = useCallback(async () => {
    if (assignedDepartments.length === 0) {
      setReports([])
      setOtherWaiting({})
      setLoading(false)
      return
    }
    try {
      const results = await Promise.all(assignedDepartments.map((department) => (
        fetchDailyReportsApi({ targetDepartment: department })
          .then((remote) => [department, Array.isArray(remote) ? remote : []])
          .catch(() => [department, null])
      )))
      const waiting = {}
      results.forEach(([department, list]) => {
        if (department === currentDepartment) {
          if (list) setReports(list)
        } else if (list) {
          const count = list.filter((report) => normalizeText(report.status) === 'submitted').length
          if (count > 0) waiting[department] = count
        }
      })
      setOtherWaiting(waiting)
    } finally {
      setLoading(false)
    }
  }, [assignedDepartments, currentDepartment])

  const loadMyRejected = useCallback(async () => {
    if (!currentDepartment || !user?.id) {
      setMyRejectedReports([])
      return
    }
    try {
      // No department filter: the backend returns all of this leadman's
      // departments, so returns show up whichever department is selected.
      const remote = await fetchDailyReportsApi()
      const mine = (Array.isArray(remote) ? remote : []).filter((report) => (
        // rejected = by the next department's leadman; returned = by production in-charge (after a GM return)
        ['rejected', 'returned'].includes(normalizeText(report.status)) && String(report.submittedBy || '') === String(user.id)
      ))
      setMyRejectedReports(mine)
    } catch {
      setMyRejectedReports([])
    }
  }, [currentDepartment, user?.id])

  useEffect(() => {
    setLoading(true)
    loadReports()
    loadMyRejected()
  }, [loadReports, loadMyRejected])

  // Reload when a report arrives (or one of ours is rejected) while this page
  // is open, with a 30s fallback that only runs while the tab is visible.
  useLiveRefresh(() => {
    loadReports()
    loadMyRejected()
  }, { types: ['daily_report_incoming', 'daily_report_rejected'], intervalMs: 30000 })

  const incomingReports = useMemo(
    () => reports.filter((report) => normalizeText(report.status) === 'submitted'),
    [reports]
  )

  // Employees for the report being resubmitted — its own department, which may
  // differ from the selected one now that returns from every department show.
  const resubmitDepartment = resubmitting?.report?.department || currentDepartment
  const departmentEmployees = useMemo(() => {
    return employees
      .filter((employee) => String(employee.department || '').toLowerCase() === String(resubmitDepartment || '').toLowerCase())
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.department || resubmitDepartment,
      }))
  }, [employees, resubmitDepartment])

  async function patchReport(report, status, notes = '') {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: status === 'rejected' ? 'Reject this report?' : 'Verify this report?',
      message: status === 'rejected'
        ? `Send this report back to ${report.submittedByName || 'the submitting leadman'} for correction?`
        : `Confirm you received what ${report.department} reported and mark it as verified?`,
      confirmText: status === 'rejected' ? 'Reject' : 'Verify',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setActionLoadingId(report.id)
    try {
      await updateDailyReportApi(report.id, {
        status,
        verifiedBy: user?.id || null,
        verifiedByName: user?.name || null,
        notes,
      })
      await loadReports()
      dialog.success({
        title: status === 'rejected' ? 'Report sent back' : 'Report verified',
        message: status === 'rejected'
          ? `The report from ${report.department} was returned for correction.`
          : `The report from ${report.department} is verified and ready for production in-charge.`,
      })
    } catch (error) {
      dialog.error({
        title: status === 'rejected' ? 'Rejection failed' : 'Verification failed',
        message: error?.message || 'Unable to update report status.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  function openResubmit(report) {
    const entries = Array.isArray(report.entries) ? report.entries : []
    const firstEntry = entries[0] || {}
    setResubmitting({
      report,
      initialValues: {
        department: report.department,
        product: firstEntry.product || '',
        quantity: firstEntry.quantity || '',
        date: report.reportDate || toManilaDateKey(),
      },
      initialSelectedEmployeeIds: entries.map((entry) => String(entry.employeeId || '')).filter(Boolean),
      initialTargetDepartment: report.targetDepartment || '',
      initialPhotoPreview: firstEntry.photos || null,
    })
  }

  async function handleResubmit(payloads) {
    if (!resubmitting?.report?.id) return
    const list = Array.isArray(payloads) ? payloads : [payloads]
    if (list.length === 0) return
    const batchCapturedAt = new Date().toISOString()
    const entries = buildEntriesFromPayloads(list, batchCapturedAt)
    await resubmitDailyReport(resubmitting.report.id, {
      department: list[0].department,
      targetDepartment: list[0].targetDepartment,
      summary: list[0].notes,
      entries,
    })
    setResubmitting(null)
    loadMyRejected()
  }

  const openPhotos = useCallback((photos, index = 0) => {
    if (Array.isArray(photos) && photos.length > 0) setPhotoViewer({ photos, index })
  }, [])
  const changePhoto = useCallback((index) => setPhotoViewer((current) => (current ? { ...current, index } : current)), [])
  const closePhotos = useCallback(() => setPhotoViewer(null), [])

  function selectTab(tab) {
    setActiveTab(tab)
    if (tab === 'rejected') markNotificationsSeen('daily_report_rejected')
  }

  const formatDT = formatProviderDateTime || fallbackFormatDateTime
  const hasRejectedUnread = Number(notificationCounts?.daily_report_rejected || 0) > 0

  const tabs = [
    { key: 'incoming', label: 'To verify', count: incomingReports.length },
    { key: 'rejected', label: 'Returned to me', count: myRejectedReports.length, dot: hasRejectedUnread },
  ]

  const itemMotion = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }

  function renderList() {
    if (loading) {
      return <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading reports...</div>
    }

    if (activeTab === 'rejected') {
      if (myRejectedReports.length === 0) {
        return <EmptyState title="Nothing returned to you" description="If the next department rejects a report you sent, it will show up here so you can fix and resubmit it." />
      }
      return myRejectedReports.map((report) => (
        <motion.div key={report.id} variants={itemMotion}>
          <ReturnedReport report={report} formatDT={formatDT} onEdit={openResubmit} onOpenPhotos={openPhotos} />
        </motion.div>
      ))
    }

    // Reports already verified leave this queue; they're on the History page
    // under "Verified by me".
    if (incomingReports.length === 0) {
      return <EmptyState title="All caught up" description={`No reports are waiting for ${currentDepartment || 'your department'} to verify.`} />
    }

    return incomingReports.map((report) => (
      <motion.div key={report.id} variants={itemMotion}>
        <IncomingReport
          report={report}
          currentDepartment={currentDepartment}
          busy={actionLoadingId === report.id}
          onVerify={(r, note) => patchReport(r, 'leadman_verified', note)}
          onReject={(r, note) => patchReport(r, 'rejected', note)}
          onOpenPhotos={openPhotos}
          formatDT={formatDT}
        />
      </motion.div>
    ))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow="Leadman verification"
        title="Incoming Reports"
        description="Check what the previous department handed over to you, then verify it or send it back."
        actions={assignedDepartments.length > 1 ? (
          <label className="flex flex-col rounded-lg border border-white/20 bg-white/10 p-2.5">
            <span className="text-xs text-emerald-50/90">Receiving department</span>
            <select value={currentDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-1 min-w-[200px] rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>
                  {department}{otherWaiting[department] ? ` (${otherWaiting[department]} waiting)` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2.5">
            <p className="text-xs text-emerald-50/90">Receiving department</p>
            <p className="mt-0.5 font-semibold text-white">{currentDepartment || '—'}</p>
          </div>
        )}
      >
        <div className="flex flex-wrap items-stretch gap-2">
          <HeaderCounter icon={Inbox} label="To verify" value={incomingReports.length} active={activeTab === 'incoming'} onClick={() => selectTab('incoming')} />
          <HeaderCounter icon={Undo2} label="Returned to me" value={myRejectedReports.length} active={activeTab === 'rejected'} onClick={() => selectTab('rejected')} />
          <Link
            to="/app/leadman/history"
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-50" />
            Verified reports are in History
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PageHeader>

      {Object.keys(otherWaiting).length > 0 ? (
        // Reports are waiting in a department that isn't selected right now.
        <div className="space-y-2">
          {Object.entries(otherWaiting).map(([department, count]) => (
            <div key={department} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4 shrink-0 text-amber-600" />
                <span><span className="font-semibold">{department}</span> has {count} report{count === 1 ? '' : 's'} waiting for verification.</span>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setSelectedLeadmanDepartment(department); selectTab('incoming') }}
              >
                Switch to {department}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => selectTab(tab.key)}
            className={`relative shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.key ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            {tab.label}
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === tab.key ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{tab.count}</span>
            {tab.dot ? <span className="absolute right-1 top-2 h-2 w-2 rounded-full bg-rose-500" /> : null}
          </button>
        ))}
      </div>

      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {renderList()}
      </motion.div>

      {photoViewer ? (
        <PhotoViewer photos={photoViewer.photos} index={photoViewer.index} onChange={changePhoto} onClose={closePhotos} />
      ) : null}

      {resubmitting ? (
        <Portal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
            <div className="flex min-h-full items-center justify-center py-8">
              <div className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Edit & resubmit</p>
                    <h3 className="mt-0.5 font-heading text-lg font-bold text-zinc-900">{resubmitting.report.department} • {formatWorkDate(resubmitting.report.reportDate)}</h3>
                  </div>
                  <button type="button" onClick={() => setResubmitting(null)} aria-label="Close" className="btn-dismiss rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 hover:bg-zinc-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[78vh] overflow-auto p-6">
                  <ReportEntryForm
                    department={resubmitting.report.department}
                    employeeOptions={departmentEmployees}
                    submitLabel="Resubmit Report"
                    initialValues={resubmitting.initialValues}
                    initialSelectedEmployeeIds={resubmitting.initialSelectedEmployeeIds}
                    initialTargetDepartment={resubmitting.initialTargetDepartment}
                    initialPhotoPreview={resubmitting.initialPhotoPreview}
                    onSubmit={handleResubmit}
                  />
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}
    </div>
  )
}
