import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FileText, CheckCircle, XCircle, ClipboardList, Check, CircleAlert, ChevronDown, Image as ImageIcon } from 'lucide-react'
import { useAppData } from '../../context/app-data-context'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { fetchDailyReportsApi } from '../../lib/api'
import LeadmanTransfers from '../../roles/leadman/pages/LeadmanTransfers'
import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'

export default function Requests() {
  const { leaveRequests = [], approveLeaveRequest, rejectLeaveRequest, formatDateTime, updateDailyReportStatus, refreshDailyReports } = useAppData()
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

  function getStatusVariant(status) {
    switch (normalizeText(status)) {
      case 'submitted':
        return 'warning'
      case 'production_verified':
      case 'leadman_verified':
      case 'approved':
        return 'success'
      case 'gm_submitted':
        return 'info'
      case 'rejected':
        return 'danger'
      default:
        return 'neutral'
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
            <p className="mt-1 text-sm text-zinc-500">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {formatDateTime ? formatDateTime(report.createdAt || report.created_at || report.reportDate) : (report.createdAt || report.created_at || report.reportDate)}</p>
            <p className="mt-1 text-sm text-zinc-400">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'} • {report.summary || 'No summary available'}</p>
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
                <p className="mt-2 text-sm font-semibold text-zinc-900">{formatDateTime ? formatDateTime(report.createdAt || report.created_at || report.reportDate) : (report.createdAt || report.created_at || report.reportDate)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Report notes</p>
              <p className="mt-2 text-sm text-zinc-800">{report.summary || 'No notes provided.'}</p>
            </div>

            {photos.length > 0 ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted photos</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {photos.slice(0, 4).map((photo, index) => (
                    <div key={`${report.id}-photo-${index}`} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                      <img src={photo} alt={`Submitted photo ${index + 1}`} className="h-40 w-full object-cover" />
                    </div>
                  ))}
                </div>
                {photos.length > 4 ? (
                  <p className="mt-3 text-sm text-zinc-500">+{photos.length - 4} more photo{photos.length - 4 === 1 ? '' : 's'}</p>
                ) : null}
              </div>
            ) : null}

            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Images</p>
                <p className="mt-2 text-sm text-zinc-800">{photos.length || 0} photo{photos.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex items-end justify-end">
                {photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotos(photos)
                      setShowPhotoModal(true)
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-white"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Preview images
                  </button>
                ) : (
                  <p className="text-sm text-zinc-400">No images submitted</p>
                )}
              </div>
            </div>

            {canApproveReport ? (
              <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label className="text-xs uppercase tracking-wide text-zinc-400">Approval notes</label>
                  <textarea
                    value={verificationNotes[report.id] || ''}
                    onChange={(event) => setVerificationNotes((current) => ({ ...current, [report.id]: event.target.value }))}
                    placeholder="Add notes before approving this report for GM."
                    className="mt-2 min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex flex-col gap-2 lg:w-[220px]">
                  <Button
                    type="button"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'approved', verificationNotes[report.id] || '')}
                  >
                    <Check className="h-4 w-4" />
                    {actionLoadingId === report.id ? 'Updating...' : 'Approve'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={actionLoadingId === report.id}
                    onClick={() => patchReport(report, 'rejected', verificationNotes[report.id] || '')}
                  >
                    <CircleAlert className="h-4 w-4" />
                    Reject report
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
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
      <PageHeader title="Requests & Submissions" description="Manage employee account submissions and approve submitted daily reports." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50/60">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-white/60'}`}
          >
            Leave requests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dailyReports')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'dailyReports' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-white/60'}`}
          >
            Daily report submissions
          </button>
        </div>

        {showSubmitDailyReport ? (
          <Button type="button">
            <ClipboardList className="h-4 w-4" />
            Submit daily report
          </Button>
        ) : null}
      </div>

      {activeTab === 'requests' ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.isArray(leaveRequests) && leaveRequests.length > 0 ? (
            leaveRequests.map((req) => {
              const status = (req.status || '').toLowerCase()
              const isPending = status === 'pending'
              return (
                <Card key={req.id} className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl h-fit ${req.leaveType ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-heading text-lg font-bold text-zinc-900">{req.employeeName || req.employee_name}</h3>
                        <Badge variant={isPending ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}>{String(req.status || '').toUpperCase()}</Badge>
                      </div>
                      <div className="text-sm text-zinc-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <span><strong className="text-zinc-700">Type:</strong> {req.leaveType || req.leave_type}</span>
                        <span className="hidden sm:inline text-zinc-600">•</span>
                        <span><strong className="text-zinc-700">Requested:</strong> {formatDateTime ? formatDateTime(req.requestedAt || req.requested_at) : (req.requestedAt || req.requested_at)}</span>
                      </div>
                      {req.reason && <p className="text-sm text-zinc-700 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200/50">{req.reason}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {isPending && canApprove ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => handleApprove(req)} className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><CheckCircle className="w-4 h-4" />Approve</Button>
                        <Button variant="outline" size="sm" onClick={() => handleReject(req)} className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"><XCircle className="w-4 h-4" />Reject</Button>
                      </>
                    ) : (
                      <div className="text-sm font-medium text-zinc-400 px-4">Processed</div>
                    )}
                  </div>
                </Card>
              )
            })
          ) : (
            <EmptyState title="No employee submissions found" />
          )}
        </div>
      ) : activeTab === 'dailyReports' ? (
        <div className="space-y-4">
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-zinc-500">Daily report submissions are reviewed here.</p>
              <p className="text-xs text-zinc-400">Approvals are available for GM, HR, admin, and production in-charge.</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-500">
              {dailyReports.length} report{dailyReports.length === 1 ? '' : 's'} loaded
            </div>
          </Card>

          {dailyLoading ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500">Loading daily report submissions...</div>
          ) : dailyReports.length === 0 ? (
            <EmptyState title="No daily report submissions available" />
          ) : (
            <div className="space-y-4">
              {dailyReports.map((report) => <ReportCard key={report.id} report={report} />)}
            </div>
          )}

          {showPhotoModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
              <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-heading text-lg font-bold text-zinc-900">Report images</h3>
                  <button type="button" onClick={() => setShowPhotoModal(false)} className="text-zinc-500 hover:text-zinc-900">Close</button>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {selectedPhotos.map((photo, index) => (
                    <div key={`${photo}-${index}`} className="aspect-square rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden">
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
