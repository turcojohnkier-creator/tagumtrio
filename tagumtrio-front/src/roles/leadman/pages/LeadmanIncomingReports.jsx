import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleAlert, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { fetchDailyReportsApi, updateDailyReportApi } from '../../../lib/api'
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

export default function LeadmanIncomingReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const { selectedLeadmanDepartment, setSelectedLeadmanDepartment, formatDateTime: formatProviderDateTime, markNotificationsSeen } = useAppData()

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
  const [loading, setLoading] = useState(true)
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [verificationNotes, setVerificationNotes] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState('')

  const loadReports = useCallback(async () => {
    if (!currentDepartment) {
      setReports([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const remote = await fetchDailyReportsApi({ targetDepartment: currentDepartment })
      setReports(Array.isArray(remote) ? remote : [])
    } finally {
      setLoading(false)
    }
  }, [currentDepartment])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const incomingReports = useMemo(
    () => reports.filter((report) => normalizeText(report.status) === 'submitted'),
    [reports]
  )

  const verifiedReports = useMemo(
    () => reports.filter((report) => ['leadman_verified', 'gm_submitted'].includes(normalizeText(report.status))),
    [reports]
  )

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

  const ReportCard = ({ report }) => {
    const isExpanded = expandedReportId === report.id
    const entries = Array.isArray(report.entries) ? report.entries : []
    const photos = getReportPhotos(report)
    const status = normalizeText(report.status)

    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-300">
        <button
          type="button"
          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/70"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-zinc-900">{report.department || 'Unknown Department'}</h3>
              <Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {report.submittedByName || report.submitted_by_name || 'Unknown'} • {formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}
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
                <p className="mt-2 text-sm font-semibold text-zinc-900">{formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}</p>
              </div>
            </div>

            {photos.length > 0 ? (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">Photos</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhotos(photos.slice(0, 4))
                    setShowPhotoModal(true)
                  }}
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
                    value={verificationNotes[report.id] || ''}
                    onChange={(event) => setVerificationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Required when rejecting — explain what needs to be corrected."
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:w-[220px]">
                  <Button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'leadman_verified', verificationNotes[report.id] || '')}
                  >
                    <Check className="h-4 w-4" />
                    {actionLoadingId === report.id ? 'Updating...' : 'Verify report'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={actionLoadingId === report.id || !verificationNotes[report.id]}
                    onClick={() => patchReport(report, 'rejected', verificationNotes[report.id] || '')}
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
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading reports...</div>
        ) : activeTab === 'incoming' ? (
          incomingReports.length === 0 ? (
            <EmptyState title="No incoming reports" description="No reports from the previous department are awaiting your verification." />
          ) : (
            incomingReports.map((report) => <ReportCard key={report.id} report={report} />)
          )
        ) : verifiedReports.length === 0 ? (
          <EmptyState title="No verified reports yet" />
        ) : (
          verifiedReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </div>

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
    </div>
  )
}
