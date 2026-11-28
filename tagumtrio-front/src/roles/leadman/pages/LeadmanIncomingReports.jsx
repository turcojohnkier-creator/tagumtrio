import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, Check, CheckCircle2, CircleAlert, Inbox, Pencil, Undo2, X,
} from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { fetchDailyReportsApi, updateDailyReportApi } from '../../../lib/api'
import { extractNote } from '../../../shared/reports/report-entry-utils'
import DailyReportTable from '../../../shared/reports/DailyReportTable'
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

// The human-written note on a report (verify/reject reasons), without the
// auto-generated summary parts. The table itself is the shared DailyReportTable.
function useReportView(report) {
  return useMemo(() => ({ note: extractNote(report.summary) }), [report.summary])
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
function IncomingReport({ report, currentDepartment, currentUserId, busy, onVerify, onReject, formatDT }) {
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const view = useReportView(report)
  const isPending = normalizeText(report.status) === 'submitted'
  // A leadman who runs both departments receives the report they sent
  // themselves. They're the next leadman too, so it can only be verified.
  const isOwnReport = currentUserId != null && report.submittedBy != null && String(report.submittedBy) === String(currentUserId)

  return (
    <div className={`space-y-4 rounded-xl border bg-white p-4 shadow-sm sm:p-5 ${isPending ? 'border-amber-200' : 'border-zinc-200'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <ReportHeading report={report} toDepartment={report.targetDepartment || currentDepartment} formatDT={formatDT} />
        {isPending ? (
          !rejecting ? (
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="btn-dismiss"
                  disabled={busy || isOwnReport}
                  title={isOwnReport ? "You sent this report yourself, so you can't reject it." : undefined}
                  onClick={() => setRejecting(true)}
                >
                  <CircleAlert className="h-4 w-4" />
                  Reject
                </Button>
                <Button type="button" disabled={busy} onClick={() => onVerify(report, '')}>
                  <Check className="h-4 w-4" />
                  {busy ? 'Updating…' : 'Verify report'}
                </Button>
              </div>
              {isOwnReport ? (
                <p className="text-xs text-zinc-500">You sent this report, so it can only be verified.</p>
              ) : null}
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

      <DailyReportTable entries={report.entries} fallbackDepartment={report.department} fallbackDate={report.reportDate} />

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

function ReturnedReport({ report, formatDT, onEdit }) {
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

      <DailyReportTable entries={report.entries} fallbackDepartment={report.department} fallbackDate={report.reportDate} />
    </div>
  )
}

/* ---------- modals ---------- */

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
  // The leadman's returned reports in their *other* departments: { department: count }.
  const [otherReturned, setOtherReturned] = useState({})
  const [loading, setLoading] = useState(true)
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
      setOtherReturned({})
      return
    }
    try {
      // No department filter: the backend returns all of this leadman's
      // departments. Only the selected department's returns are listed; the
      // rest are counted so the leadman can switch to them.
      const remote = await fetchDailyReportsApi()
      const mine = (Array.isArray(remote) ? remote : []).filter((report) => (
        // rejected = by the next department's leadman; returned = by production in-charge (after a GM return)
        ['rejected', 'returned'].includes(normalizeText(report.status)) && String(report.submittedBy || '') === String(user.id)
      ))
      const selected = normalizeText(currentDepartment)
      const current = []
      const elsewhere = {}
      mine.forEach((report) => {
        const own = normalizeText(report.department)
        const assigned = assignedDepartments.find((name) => normalizeText(name) === own)
        // A department the leadman no longer handles has no view of its own,
        // so keep those returns visible here rather than losing them.
        if (own === selected || !assigned) current.push(report)
        else elsewhere[assigned] = (elsewhere[assigned] || 0) + 1
      })
      setMyRejectedReports(current)
      setOtherReturned(elsewhere)
    } catch {
      setMyRejectedReports([])
      setOtherReturned({})
    }
  }, [assignedDepartments, currentDepartment, user?.id])

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

  // Employees for the report being resubmitted — its own department, which can
  // differ from the selected one (e.g. a department the leadman no longer handles).
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

  function selectTab(tab) {
    setActiveTab(tab)
    if (tab === 'rejected') markNotificationsSeen('daily_report_rejected')
  }

  // Dropdown hint for a department, e.g. " (2 waiting, 1 returned)".
  function departmentHint(department) {
    const parts = []
    if (otherWaiting[department]) parts.push(`${otherWaiting[department]} waiting`)
    if (otherReturned[department]) parts.push(`${otherReturned[department]} returned`)
    return parts.length > 0 ? ` (${parts.join(', ')})` : ''
  }

  const formatDT = formatProviderDateTime || fallbackFormatDateTime
  const hasRejectedUnread = Number(notificationCounts?.daily_report_rejected || 0) > 0

  const tabs = [
    { key: 'incoming', label: 'To verify', count: incomingReports.length },
    { key: 'rejected', label: 'Returned reports', count: myRejectedReports.length, dot: hasRejectedUnread },
  ]

  const itemMotion = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }

  function renderList() {
    if (loading) {
      return <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading reports...</div>
    }

    if (activeTab === 'rejected') {
      if (myRejectedReports.length === 0) {
        return <EmptyState title="Nothing returned to you" description={`If a ${currentDepartment || 'department'} report you sent is rejected or returned, it will show up here so you can fix and resubmit it.`} />
      }
      return myRejectedReports.map((report) => (
        <motion.div key={report.id} variants={itemMotion}>
          <ReturnedReport report={report} formatDT={formatDT} onEdit={openResubmit} />
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
          currentUserId={user?.id}
          busy={actionLoadingId === report.id}
          onVerify={(r, note) => patchReport(r, 'leadman_verified', note)}
          onReject={(r, note) => patchReport(r, 'rejected', note)}
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
                  {department}{departmentHint(department)}
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
          <HeaderCounter icon={Undo2} label="Returned reports" value={myRejectedReports.length} active={activeTab === 'rejected'} onClick={() => selectTab('rejected')} />
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

      {Object.keys(otherWaiting).length > 0 || Object.keys(otherReturned).length > 0 ? (
        // Reports are waiting (or were returned) in a department that isn't selected right now.
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
          {Object.entries(otherReturned).map(([department, count]) => (
            <div key={`returned-${department}`} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2">
                <Undo2 className="h-4 w-4 shrink-0 text-amber-600" />
                <span><span className="font-semibold">{department}</span> has {count} returned report{count === 1 ? '' : 's'} to fix.</span>
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setSelectedLeadmanDepartment(department); selectTab('rejected') }}
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
