import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, CircleAlert, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { fetchDailyReportsApi, updateDailyReportApi } from '../../../lib/api'
import DailyReportTable from '../../../shared/reports/DailyReportTable'
import ReportEntryForm from '../components/ReportEntryForm'
import PageHeader from '../../../shared/ui/PageHeader'
import Button from '../../../shared/ui/Button'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
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
      return 'danger'
    default:
      return 'neutral'
  }
}

function getReportPhotos(report) {
  const entries = Array.isArray(report?.entries) ? report.entries : []
  return entries.flatMap((entry) => {
    if (Array.isArray(entry?.photos)) return entry.photos
    if (entry?.photos && typeof entry.photos === 'object') return Object.values(entry.photos)
    return entry?.photoUrls || entry?.imageUrls || []
  }).filter(Boolean)
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
    scannedAt: batchCapturedAt,
  }))
}

// Defined at module scope (not inside LeadmanIncomingReports) so React keeps
// treating it as the same component across parent re-renders — otherwise a
// new function identity every render makes React remount the whole subtree
// on every keystroke, dropping focus from the textarea below after one letter.
// The note text is also kept as local state here rather than lifted into the
// parent, so typing never triggers a parent re-render in the first place.
function ReportCard({ report, isExpanded, onToggleExpand, actionLoadingId, onVerify, onReject, onViewPhotos, formatDateTime: formatDT }) {
  const [note, setNote] = useState('')
  const entries = Array.isArray(report.entries) ? report.entries : []
  const photos = getReportPhotos(report)
  const status = normalizeText(report.status)

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-300">
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/70"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-zinc-900">{report.department || 'Unknown Department'}</h3>
            <Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-500">
            {report.submittedByName || report.submitted_by_name || 'Unknown'} • {formatDT(report.createdAt || report.created_at || report.reportDate)}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} • {report.summary || 'No summary provided'}
          </p>
        </div>
        <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded ? (
        <div className="border-t border-zinc-200 bg-white/40 p-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">From department</p>
              <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{report.department || '—'}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
              <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{getStatusLabel(report.status)}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Entries</p>
              <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{entries.length}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Created</p>
              <p className="mt-2 text-sm font-semibold text-zinc-900">{formatDT(report.createdAt || report.created_at || report.reportDate)}</p>
            </div>
          </div>

          {photos.length > 0 ? (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Photos</p>
              <button
                type="button"
                onClick={() => onViewPhotos(photos)}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-white"
              >
                <ImageIcon className="h-4 w-4" />
                View photos
              </button>
            </div>
          ) : null}

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Notes</p>
            <p className="mt-2 text-sm text-zinc-800">{report.summary || 'No notes provided.'}</p>
          </div>

          {status === 'submitted' ? (
            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-400">Verification notes</label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Required when rejecting — explain what needs to be corrected."
                  className="mt-2 min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-2 lg:w-[220px]">
                <Button
                  type="button"
                  disabled={actionLoadingId === report.id}
                  onClick={() => onVerify(report, note)}
                >
                  <Check className="h-4 w-4" />
                  {actionLoadingId === report.id ? 'Updating...' : 'Verify report'}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  disabled={actionLoadingId === report.id || !note}
                  onClick={() => onReject(report, note)}
                >
                  <CircleAlert className="h-4 w-4" />
                  Reject (note required)
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              This report has already been verified and moved forward.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// Reports THIS leadman submitted (to the next department) that came back
// rejected — a different, opposite dataset from the Incoming/Verified tabs
// above (which are about reports flowing the other direction, into this
// department). Rendered as a simple row + "Edit & Resubmit", not the
// verify/reject ReportCard, since there's nothing to verify here.
function RejectedReportRow({ report, formatDateTime: formatDT, onEdit, onOpen }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate font-semibold text-zinc-900">{report.department || 'Unknown Department'}</h3>
          <Badge variant="danger">Rejected</Badge>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Sent {formatDT(report.createdAt || report.created_at || report.reportDate)} • {Array.isArray(report.entries) ? report.entries.length : 0} entr{Array.isArray(report.entries) && report.entries.length === 1 ? 'y' : 'ies'}
        </p>
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Rejected: {report.summary || 'No reason provided.'}
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="danger" size="sm" onClick={() => onEdit(report)}>Edit & Resubmit</Button>
        <Button variant="secondary" size="sm" onClick={() => onOpen(report)}>Open</Button>
      </div>
    </div>
  )
}

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
  const [myRejectedReports, setMyRejectedReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [selectedRejected, setSelectedRejected] = useState(null)
  const [resubmitting, setResubmitting] = useState(null)

  const loadReports = useCallback(async () => {
    if (!currentDepartment) {
      setReports([])
      setLoading(false)
      return
    }
    try {
      const remote = await fetchDailyReportsApi({ targetDepartment: currentDepartment })
      setReports(Array.isArray(remote) ? remote : [])
    } finally {
      setLoading(false)
    }
  }, [currentDepartment])

  const loadMyRejected = useCallback(async () => {
    if (!currentDepartment || !user?.id) {
      setMyRejectedReports([])
      return
    }
    try {
      const remote = await fetchDailyReportsApi({ department: currentDepartment })
      const mine = (Array.isArray(remote) ? remote : []).filter((report) => (
        normalizeText(report.status) === 'rejected' && String(report.submittedBy || '') === String(user.id)
      ))
      setMyRejectedReports(mine)
    } catch {
      setMyRejectedReports([])
    }
  }, [currentDepartment, user?.id])

  // Poll for newly-arrived reports and newly-rejected submissions — without
  // this, a report submitted (or rejected) while this page is already open
  // never appears until a full remount, even though nav badges update live.
  useEffect(() => {
    setLoading(true)
    loadReports()
    loadMyRejected()
    const interval = setInterval(() => {
      loadReports()
      loadMyRejected()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadReports, loadMyRejected])

  const incomingReports = useMemo(
    () => reports.filter((report) => normalizeText(report.status) === 'submitted'),
    [reports]
  )

  const verifiedReports = useMemo(
    () => reports.filter((report) => ['leadman_verified', 'gm_submitted'].includes(normalizeText(report.status))),
    [reports]
  )

  const departmentEmployees = useMemo(() => {
    return employees
      .filter((employee) => String(employee.department || '').toLowerCase() === String(currentDepartment || '').toLowerCase())
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.department || currentDepartment,
      }))
  }, [employees, currentDepartment])

  async function patchReport(report, status, notes = '') {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: status === 'rejected' ? 'Reject this report?' : 'Verify this report?',
      message: status === 'rejected'
        ? 'Reject this report and send it back to the original leadman for correction.'
        : `Mark report ${report.id} as verified?`,
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
        title: 'Report updated',
        message: `Report ${report.id} has been updated to ${getStatusLabel(status)}.`,
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
        date: report.reportDate || new Date().toISOString().slice(0, 10),
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

  function handleViewPhotos(photos) {
    setSelectedPhotos(photos)
    setShowPhotoModal(true)
  }

  const resolvedFormatDateTime = formatProviderDateTime || formatDateTime

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow="Leadman verification"
        title="Incoming Reports"
        description="Reports from the previous department, awaiting your verification before moving forward."
        actions={(
          <div className="rounded-lg border border-white/20 bg-white/10 p-3">
            <p className="text-xs uppercase tracking-wider text-emerald-50/90">Department</p>
            <select value={currentDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-1.5 min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        )}
      />

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'incoming' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          Incoming ({incomingReports.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'verified' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          Verified ({verifiedReports.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('rejected'); markNotificationsSeen('daily_report_rejected') }}
          className={`relative px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'rejected' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          Rejected ({myRejectedReports.length})
          {Number(notificationCounts?.daily_report_rejected || 0) > 0 ? (
            <span className="absolute right-1 top-2 h-2 w-2 rounded-full bg-rose-500" />
          ) : null}
        </button>
      </div>

      <motion.div
        className="space-y-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading reports...</div>
        ) : activeTab === 'rejected' ? (
          myRejectedReports.length === 0 ? (
            <EmptyState title="No rejected reports" description="Reports the next department sends back for correction will appear here." />
          ) : (
            myRejectedReports.map((report) => (
              <motion.div key={report.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}>
                <RejectedReportRow
                  report={report}
                  formatDateTime={resolvedFormatDateTime}
                  onEdit={openResubmit}
                  onOpen={setSelectedRejected}
                />
              </motion.div>
            ))
          )
        ) : (() => {
          const activeReports = activeTab === 'incoming' ? incomingReports : verifiedReports
          const emptyText = activeTab === 'incoming'
            ? { title: 'No incoming reports', description: 'No reports from the previous department are awaiting your verification.' }
            : { title: 'No verified reports yet' }

          if (activeReports.length === 0) return <EmptyState title={emptyText.title} description={emptyText.description} />

          return activeReports.map((report) => (
            <motion.div key={report.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}>
              <ReportCard
                report={report}
                isExpanded={expandedReportId === report.id}
                onToggleExpand={() => setExpandedReportId((current) => (current === report.id ? null : report.id))}
                actionLoadingId={actionLoadingId}
                onVerify={(r, note) => patchReport(r, 'leadman_verified', note)}
                onReject={(r, note) => patchReport(r, 'rejected', note)}
                onViewPhotos={handleViewPhotos}
                formatDateTime={resolvedFormatDateTime}
              />
            </motion.div>
          ))
        })()}
      </motion.div>

      {showPhotoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-zinc-900">Verification photos</h3>
              <button type="button" onClick={() => setShowPhotoModal(false)} className="text-zinc-500 hover:text-zinc-900">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {selectedPhotos.map((photo, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  <img src={photo} alt={`Verification ${index + 1}`} className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {selectedRejected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Rejected report</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{selectedRejected.department} • {selectedRejected.reportDate}</h3>
              </div>
              <button onClick={() => setSelectedRejected(null)} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700">Close</button>
            </div>
            <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Rejected: {selectedRejected.summary || 'No reason provided.'}
              </div>
              <DailyReportTable entries={selectedRejected.entries || []} fallbackDepartment={selectedRejected.department} />
            </div>
          </div>
        </div>
      ) : null}

      {resubmitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Edit & resubmit</p>
                <h3 className="font-heading text-lg font-bold text-zinc-900">{resubmitting.report.department} • {resubmitting.report.reportDate}</h3>
              </div>
              <button onClick={() => setResubmitting(null)} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700">Close</button>
            </div>
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
      ) : null}
    </div>
  )
}
