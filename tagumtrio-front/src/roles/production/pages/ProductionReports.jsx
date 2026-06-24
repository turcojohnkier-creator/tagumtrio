import { useMemo, useState } from 'react'
import { ChevronDown, Check, CircleAlert, Image as ImageIcon, Send } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useQr } from '../../../context/qr-context'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function extractEntries(report) {
  return Array.isArray(report?.entries) ? report.entries : []
}

function getStatusLabel(status) {
  switch (normalizeText(status)) {
    case 'submitted':
      return 'Pending review'
    case 'production_verified':
      return 'Production verified'
    case 'leadman_verified':
      return 'Leadman verified'
    case 'gm_submitted':
      return 'Sent to GM'
    case 'rejected':
      return 'Rejected'
    default:
      return status || 'Unknown'
  }
}

function getStatusClasses(status) {
  switch (normalizeText(status)) {
    case 'submitted':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20'
    case 'production_verified':
      return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
    case 'leadman_verified':
      return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    case 'gm_submitted':
      return 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    case 'rejected':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/20'
    default:
      return 'bg-slate-500/10 text-slate-300 border-slate-500/20'
  }
}

export default function ProductionReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const {
    dailyReports = [],
    refreshDailyReports,
    updateDailyReportStatus,
    formatDateTime: formatProviderDateTime,
  } = useQr()

  const [activeTab, setActiveTab] = useState('reviewed')
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [verificationNotes, setVerificationNotes] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState('')

  const pendingReports = useMemo(
    () => (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => normalizeText(report.status) === 'submitted'),
    [dailyReports]
  )

  const reviewedReports = useMemo(
    () => (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => ['production_verified', 'leadman_verified', 'gm_submitted', 'rejected'].includes(normalizeText(report.status))),
    [dailyReports]
  )

  async function patchReport(report, status, notes = '') {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: status === 'rejected' ? 'Reject this report?' : 'Update report status?',
      message: status === 'rejected'
        ? 'Reject this report and send it back for correction?'
        : `Update report ${report.id} to ${getStatusLabel(status)}?`,
      confirmText: status === 'rejected' ? 'Reject' : 'Update',
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
        message: `Report ${report.id} is now marked as ${getStatusLabel(status)}.`,
      })
    } catch (error) {
      dialog.error({
        title: 'Update failed',
        message: error?.message || 'Unable to update report status.',
      })
    } finally {
      setActionLoadingId('')
    }
  }

  const ReportCard = ({ report }) => {
    const isExpanded = expandedReportId === report.id
    const entries = extractEntries(report)
    const photos = entries.flatMap((entry) => entry?.photos || entry?.photoUrls || entry?.imageUrls || []).filter(Boolean)
    const status = normalizeText(report.status)
    const notes = verificationNotes[report.id] || ''

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 transition-colors hover:border-slate-700">
        <button
          type="button"
          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-900/70"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-white">{report.department || 'Unknown Department'} • {report.reportDate || report.report_date || 'No date'}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusClasses(report.status)}`}>{getStatusLabel(report.status)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Submitted by {report.submittedByName || report.submitted_by_name || 'Unknown'} • {formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} • {report.summary || 'No summary provided'}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded ? (
          <div className="border-t border-slate-800 bg-slate-900/40 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
                <p className="mt-2 text-lg font-semibold text-white">{report.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{getStatusLabel(report.status)}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Entries</p>
                <p className="mt-2 text-lg font-semibold text-white">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Created</p>
                <p className="mt-2 text-sm font-semibold text-white">{formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Report notes</p>
              <p className="mt-2 text-sm text-slate-200">{report.summary || 'No summary provided.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Images</p>
                <p className="mt-2 text-sm text-slate-200">{photos.length || 0} photo{photos.length === 1 ? '' : 's'}</p>
              </div>
              <div className="sm:col-span-3">
                {photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotos(photos.slice(0, 4))
                      setShowPhotoModal(true)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Preview images
                  </button>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No images available</p>
                )}
              </div>
            </div>

            {normalizeText(report.status) === 'submitted' ? (
              <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Verification notes</label>
                  <textarea
                    value={verificationNotes[report.id] || ''}
                    onChange={(event) => setVerificationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Add notes before marking this report as verified."
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:w-[220px]">
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'production_verified', verificationNotes[report.id] || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Check className="h-4 w-4" />
                    {actionLoadingId === report.id ? 'Updating...' : 'Verify report'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'rejected', verificationNotes[report.id] || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CircleAlert className="h-4 w-4" />
                    Reject report
                  </button>
                </div>
              </div>
            ) : normalizeText(report.status) === 'production_verified' || normalizeText(report.status) === 'leadman_verified' ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ready for next step</p>
                  <p className="mt-1 text-sm text-slate-300">This report has already been verified and can be forwarded to GM.</p>
                </div>
                <button
                  type="button"
                  disabled={actionLoadingId === report.id}
                  onClick={() => patchReport(report, 'gm_submitted')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Send className="h-4 w-4" />
                  Submit to GM
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Production in-charge</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Production Reports</h1>
      </div>

      <div className="flex gap-2 border-b border-slate-800">
        
        <button
          type="button"
          onClick={() => setActiveTab('reviewed')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'reviewed' ? 'border-emerald-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Reviewed ({reviewedReports.length})
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'pending' ? (
          pendingReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 px-4 py-8 text-sm text-slate-400">
              No submitted reports waiting for production review.
            </div>
          ) : (
            pendingReports.map((report) => <ReportCard key={report.id} report={report} />)
          )
        ) : reviewedReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900 px-4 py-8 text-sm text-slate-400">
            No reviewed reports yet.
          </div>
        ) : (
          reviewedReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </div>

      {showPhotoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Verification photos</h3>
              <button type="button" onClick={() => setShowPhotoModal(false)} className="text-slate-400 hover:text-white">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {selectedPhotos.map((photo, index) => (
                <div key={`${photo}-${index}`} className="aspect-square rounded-xl border border-slate-800 bg-slate-950 p-3 text-center text-sm text-slate-400">
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
