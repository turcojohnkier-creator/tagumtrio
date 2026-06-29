import { useEffect, useMemo, useState } from 'react'
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

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

function leaveDurationLabel(req) {
  const startDate = req.startDate || req.start_date
  const endDate = req.endDate || req.end_date
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (days <= 0) return null
  return days === 1 ? '1 day' : `${days} days`
}

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
  const [statusTab, setStatusTab] = useState('pending')

  const canApprove = user && ['leadman', 'production_incharge', 'hr', 'admin', 'gm'].includes(user.role)

  const filteredRequests = useMemo(
    () => (Array.isArray(leaveRequests) ? leaveRequests : []).filter((req) => String(req.status || '').toLowerCase() === statusTab),
    [leaveRequests, statusTab]
  )

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
      <PageHeader tone="brand" title="Requests & Submissions" description="Manage employee account submissions and leave requests." />

      <div className="flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50/60 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${statusTab === tab.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-white/60'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const status = (req.status || '').toLowerCase()
            const isPending = status === 'pending'
            const duration = leaveDurationLabel(req)
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
                      {duration ? (
                        <>
                          <span><strong className="text-zinc-700">Duration:</strong> {duration}</span>
                          <span className="hidden sm:inline text-zinc-600">•</span>
                        </>
                      ) : null}
                      <span><strong className="text-zinc-700">Requested:</strong> {formatDateTime ? formatDateTime(req.requestedAt || req.requested_at) : (req.requestedAt || req.requested_at)}</span>
                    </div>
                    {req.reason && <p className="text-sm text-zinc-700 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200/50">{req.reason}</p>}
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                  {isPending && canApprove ? (
                    <>
                      <Button variant="successOutline" size="sm" onClick={() => handleApprove(req)}><CheckCircle className="w-4 h-4" />Approve</Button>
                      <Button variant="dangerOutline" size="sm" onClick={() => handleReject(req)}><XCircle className="w-4 h-4" />Reject</Button>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-zinc-400 px-4">Processed</div>
                  )}
                </div>
              </Card>
            )
          })
        ) : (
          <EmptyState title={`No ${statusTab} requests found`} />
        )}
      </div>
    </div>
  )
}
