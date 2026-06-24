import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FileText, CheckCircle, XCircle, Clock, ArrowRightLeft, ClipboardList, Check, CircleAlert, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { useQr } from '../../context/qr-context'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { fetchDailyReportsApi } from '../../lib/api'
import LeadmanTransfers from '../../roles/leadman/pages/LeadmanTransfers'

export default function Requests() {
  const { leaveRequests = [], approveLeaveRequest, rejectLeaveRequest, formatDateTime, updateDailyReportStatus, refreshDailyReports } = useQr()
  const { user } = useAuth()
  const dialog = useDialog()

  if (user?.role === 'hr') {
    return <Navigate to="/app/hr" replace />
  }
  const [activeTab, setActiveTab] = useState('requests')
  const [dailyReports, setDailyReports] = useState([])
  const [dailyLoading, setDailyLoading] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [verificationNotes, setVerificationNotes] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState('')

  const canApprove = user && ['leadman', 'production_incharge', 'hr', 'admin', 'gm'].includes(user.role)
  const canApproveDaily = user && ['hr', 'admin', 'gm', 'production_incharge'].includes(user.role)
  const showSubmitDailyReport = user?.role === 'finance'

  useEffect(() => {
    let mounted = true
    setDailyLoading(true)
    fetchDailyReportsApi()
      .then((reports) => {
        if (!mounted) return
        setDailyReports(Array.isArray(reports) ? reports : [])
      })
      .catch(() => {
        if (mounted) setDailyReports([])
      })
      .finally(() => {
        if (mounted) setDailyLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleApprove(req) {
    const confirmed = await dialog.confirm({
      title: 'Approve leave request?',
      message: `Approve leave request for ${req.employeeName || req.employee_name}?`,
      confirmText: 'Yes, approve',
      cancelText: 'No',
    })
    if (!confirmed) return

    try {
      await approveLeaveRequest(req.id, user?.id)
      dialog.success({
        title: 'Request approved',
        message: `Leave request for ${req.employeeName || req.employee_name} was approved successfully.`,
      })
    } catch (e) {
      console.error(e)
      dialog.error({
        title: 'Approval failed',
        message: 'Failed to approve request. Please try again.',
      })
    }
  }

  async function handleReject(req) {
    const confirmed = await dialog.confirm({
      title: 'Reject leave request?',
      message: `Reject leave request from ${req.employeeName || req.employee_name}?`,
      confirmText: 'Yes, reject',
      cancelText: 'No',
    })
    if (!confirmed) return

    try {
      await rejectLeaveRequest(req.id, user?.id, 'Rejected by approver')
      dialog.success({
        title: 'Request rejected',
        message: `Leave request from ${req.employeeName || req.employee_name} was rejected successfully.`,
      })
    } catch (e) {
      console.error(e)
      dialog.error({
        title: 'Rejection failed',
        message: 'Failed to reject request. Please try again.',
      })
    }
  }

  function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
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
        return 'Pending GM approval'
      case 'approved':
        return 'Approved by GM'
      case 'rejected':
        return 'Rejected'
      default:
        return status || 'Unknown'
    }
  }

  function getStatusClasses(status) {
    switch (normalizeText(status)) {
      case 'submitted':
        return 'bg-amber-500/10 text-amber-700 border-amber-500/20'
      case 'production_verified':
        return 'bg-cyan-500/10 text-cyan-700 border-cyan-500/20'
      case 'leadman_verified':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      case 'gm_submitted':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'approved':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
      case 'rejected':
        return 'bg-rose-500/10 text-rose-700 border-rose-500/20'
      default:
        return 'bg-slate-500/10 text-slate-700 border-slate-400/20'
    }
  }

  async function patchReport(report, status, notes = '') {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: status === 'rejected' ? 'Reject this report?' : 'Approve?',
      message: status === 'rejected'
        ? 'Reject this report and send it back for correction.'
        : `Approve report ${report.id} for GM processing and payroll review?`,
      confirmText: status === 'rejected' ? 'Reject' : 'Approve',
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
        message: `Report ${report.id} has been ${status === 'approved' ? 'approved for GM' : 'rejected'}.`,
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
    const entries = Array.isArray(report.entries) ? report.entries : []
    const photos = entries.flatMap((entry) => entry?.photos || entry?.photoUrls || entry?.imageUrls || []).filter(Boolean)
    const status = normalizeText(report.status)
    const notes = verificationNotes[report.id] || ''
    const canApproveReport = canApproveDaily && ['submitted', 'production_verified', 'leadman_verified', 'gm_submitted'].includes(status)

    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:border-slate-300">
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
            <p className="mt-1 text-sm text-slate-500">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {formatDateTime ? formatDateTime(report.createdAt || report.created_at || report.reportDate) : (report.createdAt || report.created_at || report.reportDate)}</p>
            <p className="mt-1 text-sm text-slate-400">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'} • {report.summary || 'No summary available'}</p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded ? (
          <div className="border-t border-slate-200 bg-white/40 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Department</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{report.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{getStatusLabel(report.status)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Entries</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Created</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime ? formatDateTime(report.createdAt || report.created_at || report.reportDate) : (report.createdAt || report.created_at || report.reportDate)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Report notes</p>
              <p className="mt-2 text-sm text-slate-800">{report.summary || 'No notes provided.'}</p>
            </div>

            {photos.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submitted photos</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {photos.slice(0, 4).map((photo, index) => (
                    <div key={`${report.id}-photo-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img src={photo} alt={`Submitted photo ${index + 1}`} className="h-40 w-full object-cover" />
                    </div>
                  ))}
                </div>
                {photos.length > 4 ? (
                  <p className="mt-3 text-sm text-slate-500">+{photos.length - 4} more photo{photos.length - 4 === 1 ? '' : 's'}</p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Images</p>
                <p className="mt-2 text-sm text-slate-800">{photos.length || 0} photo{photos.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex items-end justify-end">
                {photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotos(photos)
                      setShowPhotoModal(true)
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:border-slate-300 hover:bg-white"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Preview images
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">No images submitted</p>
                )}
              </div>
            </div>

            {canApproveReport ? (
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Approval notes</label>
                  <textarea
                    value={verificationNotes[report.id] || ''}
                    onChange={(event) => setVerificationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Add notes before approving this report for GM."
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:w-[220px]">
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'approved', verificationNotes[report.id] || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Check className="h-4 w-4" />
                    {actionLoadingId === report.id ? 'Updating...' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'rejected', verificationNotes[report.id] || '')}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 font-medium text-rose-700 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <CircleAlert className="h-4 w-4" />
                    Reject report
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {status === 'approved'
                  ? 'This report has been approved by GM.'
                  : status === 'rejected'
                  ? 'This report has been rejected.'
                  : 'No GM action is needed at this time.'}
              </div>
            )}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Requests & Submissions</h2>
        <p className="text-slate-500 mt-1">Manage employee account submissions and approve submitted daily reports.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-hidden rounded-full border border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-white text-slate-900' : 'text-slate-500 hover:bg-white/60'}`}
          >
            Leave requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dailyReports')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'dailyReports' ? 'bg-white text-slate-900' : 'text-slate-500 hover:bg-white/60'}`}
          >
            Daily report submissions
          </button>
          
        </div>

        {showSubmitDailyReport ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            <ClipboardList className="h-4 w-4" />
            Submit daily report
          </button>
        ) : null}
      </div>

      {activeTab === 'requests' ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.isArray(leaveRequests) && leaveRequests.length > 0 ? (
            leaveRequests.map((req) => {
              const status = (req.status || '').toLowerCase()
              const isPending = status === 'pending'
              return (
                <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl h-fit ${req.leaveType ? 'bg-rose-500/10 text-rose-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{req.employeeName || req.employee_name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isPending ? 'bg-amber-500/10 text-amber-700' : req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>{String(req.status || '').toUpperCase()}</span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <span><strong className="text-slate-700">Type:</strong> {req.leaveType || req.leave_type}</span>
                        <span className="hidden sm:inline text-slate-600">•</span>
                        <span><strong className="text-slate-700">Requested:</strong> {formatDateTime ? formatDateTime(req.requestedAt || req.requested_at) : (req.requestedAt || req.requested_at)}</span>
                      </div>
                      {req.reason && <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-2 rounded border border-slate-200/50">{req.reason}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {isPending && canApprove ? (
                      <>
                        <button onClick={() => handleApprove(req)} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"><CheckCircle className="w-4 h-4" />Approve</button>
                        <button onClick={() => handleReject(req)} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-rose-500/20"><XCircle className="w-4 h-4" />Reject</button>
                      </>
                    ) : (
                      <div className="text-sm font-medium text-slate-400 px-4">Processed</div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-6 text-sm text-slate-500">No employee submissions found.</div>
          )}
        </div>
      ) : activeTab === 'dailyReports' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">Daily report submissions are reviewed here.</p>
              <p className="text-xs text-slate-400">Approvals are available for GM, HR, admin, and production in-charge.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
              {dailyReports.length} report{dailyReports.length === 1 ? '' : 's'} loaded
            </div>
          </div>

          {dailyLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading daily report submissions...</div>
          ) : dailyReports.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No daily report submissions available.</div>
          ) : (
            <div className="space-y-4">
              {dailyReports.map((report) => <ReportCard key={report.id} report={report} />)}
            </div>
          )}

          {showPhotoModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
              <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Report images</h3>
                  <button type="button" onClick={() => setShowPhotoModal(false)} className="text-slate-500 hover:text-slate-900">Close</button>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {selectedPhotos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="aspect-square rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <img src={photo} alt={`Report photo ${index + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : activeTab === 'reassign' ? (
        <div>
          <LeadmanTransfers />
        </div>
      ) : null}
    </div>
  )
}
