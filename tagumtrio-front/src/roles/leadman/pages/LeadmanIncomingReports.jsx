import { useMemo, useState } from 'react'
import { Check, CircleAlert, ChevronDown, Image as ImageIcon } from 'lucide-react'
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

function getStatusClasses(status) {
  switch (normalizeText(status)) {
    case 'production_verified':
      return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20'
    case 'leadman_verified':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
    case 'gm_submitted':
      return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
    case 'rejected':
      return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
    default:
      return 'bg-slate-500/10 text-slate-700 border-slate-400/20'
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
  } = useQr()

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
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300">
        <button
          type="button"
          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/70"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-slate-900">{report.department || 'Unknown Department'}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusClasses(report.status)}`}>{getStatusLabel(report.status)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {report.submittedByName || report.submitted_by_name || 'Unknown'} • {formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} • {report.summary || 'No summary provided'}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded ? (
          <div className="border-t border-slate-200 bg-white/40 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Department</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{report.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{getStatusLabel(report.status)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Entries</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Created</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}</p>
              </div>
            </div>

            {photos.length > 0 ? (
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Photos</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPhotos(photos.slice(0, 4))
                    setShowPhotoModal(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-white"
                >
                  <ImageIcon className="h-4 w-4" />
                  View photos
                </button>
              </div>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-2 text-sm text-slate-800">{report.summary || 'No notes provided.'}</p>
            </div>

            {status === 'production_verified' ? (
              <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs uppercase tracking-wide text-slate-400">Verification notes</label>
                  <textarea
                    value={verificationNotes[report.id] || ''}
                    onChange={(event) => setVerificationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Add verification notes before approving this report."
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:w-[220px]">
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'leadman_verified', verificationNotes[report.id] || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Check className="h-4 w-4" />
                    {actionLoadingId === report.id ? 'Updating...' : 'Verify report'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'rejected', verificationNotes[report.id] || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-medium text-rose-700 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CircleAlert className="h-4 w-4" />
                    Flag issue
                  </button>
                </div>
              </div>
            ) : report.status === 'leadman_verified' || report.status === 'gm_submitted' ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
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
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-400">Leadman verification</p>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">Incoming Reports</h1>
        <p className="mt-1 text-slate-500">Review production-verified reports before starting the next department step.</p>
      </div>

      {currentDepartment ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Active department: <span className="font-semibold text-slate-900">{currentDepartment}</span>
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'incoming' ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Incoming ({incomingReports.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'verified' ? 'border-emerald-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Verified ({verifiedReports.length})
        </button>
      </div>

      <div className="space-y-3">
        {activeTab === 'incoming' ? (
          incomingReports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
              No incoming reports are ready for leadman verification.
            </div>
          ) : (
            incomingReports.map((report) => <ReportCard key={report.id} report={report} />)
          )
        ) : verifiedReports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-sm text-slate-500">
            No verified reports yet.
          </div>
        ) : (
          verifiedReports.map((report) => <ReportCard key={report.id} report={report} />)
        )}
      </div>

      {showPhotoModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-lg border border-slate-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Verification photos</h3>
              <button type="button" onClick={() => setShowPhotoModal(false)} className="text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {selectedPhotos.map((photo, index) => (
                <div key={`${photo}-${index}`} className="aspect-square rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-sm text-slate-500">
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
