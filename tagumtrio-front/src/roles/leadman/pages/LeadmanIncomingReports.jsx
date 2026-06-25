import { useMemo, useState } from 'react'
import { Check, CircleAlert, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
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
    case 'production_verified':
      return 'Ready for leadman verify'
    case 'leadman_verified':
      return 'Leadman verified'
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
    case 'production_verified':
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

export default function LeadmanIncomingReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const {
    selectedLeadmanDepartment,
    dailyReports = [],
    refreshDailyReports,
    updateDailyReportStatus,
    formatDateTime: formatProviderDateTime,
  } = useAppData()

  const [activeTab, setActiveTab] = useState('incoming')
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [verificationNotes, setVerificationNotes] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState('')

  const currentDepartment = selectedLeadmanDepartment || user?.department || user?.departments?.[0] || ''

  const incomingReports = useMemo(
    () => (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => normalizeText(report.status) === 'production_verified'),
    [dailyReports]
  )

  const verifiedReports = useMemo(
    () => (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => ['leadman_verified', 'gm_submitted'].includes(normalizeText(report.status))),
    [dailyReports]
  )

  async function patchReport(report, status, notes = '') {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: status === 'rejected' ? 'Flag this report?' : 'Verify this report?',
      message: status === 'rejected'
        ? 'Flag this report for correction and send it back to production.'
        : `Mark report ${report.id} as leadman verified?`,
      confirmText: status === 'rejected' ? 'Flag' : 'Verify',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setActionLoadingId(report.id)
    try {
      await updateDailyReportStatus(report.id, {
        status,
        verifiedBy: user?.id || null,
        verifiedByName: user?.name || null,
        notes,
      })
      await refreshDailyReports()
      dialog.success({
        title: 'Report updated',
        message: `Report ${report.id} has been updated to ${getStatusLabel(status)}.`,
      })
    } catch (error) {
      dialog.error({
        title: 'Verification failed',
        message: error?.message || 'Unable to update report status.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const ReportCard = ({ report }) => {
    const isExpanded = expandedReportId === report.id
    const entries = Array.isArray(report.entries) ? report.entries : []
    const photos = entries.flatMap((entry) => entry?.photos || entry?.photoUrls || entry?.imageUrls || []).filter(Boolean)
    const status = normalizeText(report.status)
    const notes = verificationNotes[report.id] || ''

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
                <p className="text-xs uppercase tracking-wide text-zinc-400">Department</p>
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

            {status === 'production_verified' ? (
              <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs uppercase tracking-wide text-zinc-400">Verification notes</label>
                  <textarea
                    value={verificationNotes[report.id] || ''}
                    onChange={(event) => setVerificationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Add verification notes before approving this report."
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
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'rejected', verificationNotes[report.id] || '')}
                  >
                    <CircleAlert className="h-4 w-4" />
                    Flag issue
                  </Button>
                </div>
              </div>
            ) : report.status === 'leadman_verified' || report.status === 'gm_submitted' ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                This report has already been verified and moved forward.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leadman verification"
        title="Incoming Reports"
        description="Review production-verified reports before starting the next department step."
      />

      {currentDepartment ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3 text-sm text-zinc-700">
          Active department: <span className="font-semibold text-emerald-700">{currentDepartment}</span>
        </div>
      ) : null}

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
        {activeTab === 'incoming' ? (
          incomingReports.length === 0 ? (
            <EmptyState title="No incoming reports" description="No incoming reports are ready for leadman verification." />
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
                <div key={`${photo}-${index}`} className="aspect-square rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-center text-sm text-zinc-500">
                  <ImageIcon className="mx-auto mb-2 h-8 w-8" />
                  <p className="truncate">{photo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
