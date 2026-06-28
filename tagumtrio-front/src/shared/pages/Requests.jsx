import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FileText, CheckCircle, XCircle } from 'lucide-react'
import { useAppData } from '../../context/app-data-context'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'

export default function Requests() {
  const { leaveRequests = [], approveLeaveRequest, rejectLeaveRequest, formatDateTime, markNotificationsSeen } = useAppData()
  const { user } = useAuth()
  const dialog = useDialog()

  useEffect(() => {
    markNotificationsSeen('leave_request_new')
  }, [])

  if (user?.role === 'hr') {
    return <Navigate to="/app/hr" replace />
  }
  const [activeTab, setActiveTab] = useState('requests')

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
      <PageHeader title="Requests & Submissions" description="Manage employee account submissions and leave requests." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50/60">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'requests' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-white/60'}`}
          >
            Leave requests
          </button>
        </div>
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
      ) : null}
    </div>
  )
}
