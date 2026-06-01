import { useEffect, useState } from 'react'
import { FileText, CheckCircle, XCircle, Clock, ArrowRightLeft, ClipboardList } from 'lucide-react'
import { useQr } from '../../context/qr-context'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { fetchDailyReportsApi } from '../../lib/api'

export default function Requests() {
  const { leaveRequests = [], approveLeaveRequest, rejectLeaveRequest, formatDateTime } = useQr()
  const { user } = useAuth()
  const dialog = useDialog()
  const [activeTab, setActiveTab] = useState('requests')
  const [dailyReports, setDailyReports] = useState([])
  const [dailyLoading, setDailyLoading] = useState(false)

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Requests & Submissions</h2>
        <p className="text-slate-400 mt-1">Manage employee account submissions and approve submitted daily reports.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-hidden rounded-full border border-slate-800 bg-slate-950">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-900/60'}`}
          >
            Employee submissions
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dailyReports')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'dailyReports' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-900/60'}`}
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
                <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                  <div className="flex gap-4">
                    <div className={`p-3 rounded-xl h-fit ${req.leaveType ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{req.employeeName || req.employee_name}</h3>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isPending ? 'bg-amber-500/10 text-amber-400' : req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{String(req.status || '').toUpperCase()}</span>
                      </div>
                      <div className="text-sm text-slate-400 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <span><strong className="text-slate-300">Type:</strong> {req.leaveType || req.leave_type}</span>
                        <span className="hidden sm:inline text-slate-600">•</span>
                        <span><strong className="text-slate-300">Requested:</strong> {formatDateTime ? formatDateTime(req.requestedAt || req.requested_at) : (req.requestedAt || req.requested_at)}</span>
                      </div>
                      {req.reason && <p className="text-sm text-slate-300 mt-2 bg-slate-950 p-2 rounded border border-slate-800/50">{req.reason}</p>}
                    </div>
                  </div>

                  <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                    {isPending && canApprove ? (
                      <>
                        <button onClick={() => handleApprove(req)} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"><CheckCircle className="w-4 h-4" />Approve</button>
                        <button onClick={() => handleReject(req)} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-rose-500/20"><XCircle className="w-4 h-4" />Reject</button>
                      </>
                    ) : (
                      <div className="text-sm font-medium text-slate-500 px-4">Processed</div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-6 text-sm text-slate-400">No employee submissions found.</div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Daily report submissions are reviewed here.</p>
              <p className="text-xs text-slate-500">Approvals are available for GM, HR, admin, and production in-charge.</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400">
              {dailyReports.length} report{dailyReports.length === 1 ? '' : 's'} loaded
            </div>
          </div>

          {dailyLoading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">Loading daily report submissions...</div>
          ) : dailyReports.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">No daily report submissions available.</div>
          ) : (
            <div className="grid gap-4">
              {dailyReports.map((report) => {
                const status = (report.status || 'pending').toLowerCase()
                const isPending = status === 'pending'
                return (
                  <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex gap-4 flex-1">
                      <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-300">
                        <ClipboardList className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-white">{report.department || 'Unknown department'}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isPending ? 'bg-amber-500/10 text-amber-400' : report.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{String(report.status || 'pending').toUpperCase()}</span>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {formatDateTime ? formatDateTime(report.createdAt || report.created_at) : (report.createdAt || report.created_at)}</div>
                        <div className="text-sm text-slate-300 mt-2">Entries: {Array.isArray(report.entries) ? report.entries.length : 0}</div>
                      </div>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                      {isPending && canApproveDaily ? (
                        <>
                          <button onClick={async () => {
                            const confirmed = await dialog.confirm({ title: 'Approve daily report?', message: `Approve the daily report from ${report.department || 'this department'}?`, confirmText: 'Yes, approve', cancelText: 'No' })
                            if (!confirmed) return
                            dialog.success({ title: 'Report approved', message: 'Daily report approval recorded.' })
                          }} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"><CheckCircle className="w-4 h-4" />Approve</button>
                          <button onClick={async () => {
                            const confirmed = await dialog.confirm({ title: 'Reject daily report?', message: `Reject the daily report from ${report.department || 'this department'}?`, confirmText: 'Yes, reject', cancelText: 'No' })
                            if (!confirmed) return
                            dialog.success({ title: 'Report rejected', message: 'Daily report rejection recorded.' })
                          }} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-rose-500/20"><XCircle className="w-4 h-4" />Reject</button>
                        </>
                      ) : (
                        <div className="text-sm font-medium text-slate-500 px-4">Processed</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
