import { FileText, CheckCircle, XCircle, Clock, ArrowRightLeft } from 'lucide-react'
import { useQr } from '../../context/qr-context'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'

export default function Requests() {
  const { leaveRequests = [], approveLeaveRequest, rejectLeaveRequest, formatDateTime } = useQr()
  const { user } = useAuth()
  const dialog = useDialog()

  const canApprove = user && ['leadman', 'production_incharge', 'hr', 'admin', 'gm'].includes(user.role)

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
        <h2 className="text-2xl font-bold text-white">Requests & Transfers</h2>
        <p className="text-slate-400 mt-1">Manage employee leaves, overtimes, and department transfers.</p>
      </div>

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
                  {isPending && canApprove && (
                    <>
                      <button onClick={() => handleApprove(req)} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-emerald-500/20"><CheckCircle className="w-4 h-4" />Approve</button>
                      <button onClick={() => handleReject(req)} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-rose-500/20"><XCircle className="w-4 h-4" />Reject</button>
                    </>
                  )}
                  {!isPending && <div className="text-sm font-medium text-slate-500 px-4">Processed</div>}
                </div>
              </div>
            )
          })
        ) : (
          <div className="p-6 text-sm text-slate-400">No leave requests found.</div>
        )}
      </div>
    </div>
  )
}
