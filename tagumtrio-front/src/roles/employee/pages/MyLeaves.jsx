import { useEffect, useMemo, useState, useCallback } from 'react'
import { ArrowLeft, CheckCircle2, Hourglass, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'

const listV = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const itemV = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import Card from '../../../shared/ui/Card'
import EmptyState from '../../../shared/ui/EmptyState'
import Badge from '../../../shared/ui/Badge'

export default function MyLeaves() {
  const { user } = useAuth()
  const { getEmployeeLeaveRequests, getEmployeeTotals, formatDateTime, markNotificationsSeen } = useAppData()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('approved-leaves')

  useEffect(() => {
    markNotificationsSeen('leave_request_status')
  }, [])

  const leaveRequests = getEmployeeLeaveRequests(user?.id)
  const totals = getEmployeeTotals(user?.id)

  const resolveDisplayDepartment = useCallback((user, totals) => {
    // 1. Prioritize the standard department column first (e.g., "Sorting")
    if (user?.department) {
      return user.department;
    }

    // 2. If it's a leadman, show the list from the JSON array
    if (user?.role === 'leadman' && Array.isArray(user?.departments) && user.departments.length > 0) {
      return user.departments.join(', ');
    }

    // 3. Fallback to totals or "Unassigned"
    return totals?.currentDepartment || 'Unassigned';
  }, []);

  const displayDept = useMemo(() => resolveDisplayDepartment(user, totals), [user, totals, resolveDisplayDepartment]);

  const approvedLeaves = useMemo(() => leaveRequests.filter((request) => String(request.status || '').toLowerCase() === 'approved'), [leaveRequests])
  const pendingLeaves = useMemo(() => leaveRequests.filter((request) => String(request.status || '').toLowerCase() === 'pending'), [leaveRequests])
  const rejectedLeaves = useMemo(() => leaveRequests.filter((request) => String(request.status || '').toLowerCase() === 'rejected'), [leaveRequests])

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={() => navigate('/app/portal')} className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
              <ArrowLeft className="w-4 h-4" /> Back to overview
            </button>
            <h2 className="font-heading text-2xl font-bold text-zinc-900">Leaves &amp; Requests</h2>
            <p className="mt-1 text-sm text-zinc-500">Track your leave requests, approved leaves, and department changes in one place.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Department</p>
            <p className="mt-2 text-lg font-semibold text-zinc-900">{displayDept}</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Leave requests</p>
            <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900">{leaveRequests.length}</p>
            <div className="mt-2 flex gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{approvedLeaves.length} approved</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{pendingLeaves.length} pending</span>
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />{rejectedLeaves.length} rejected</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('approved-leaves')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'approved-leaves' ? 'bg-emerald-600 text-white shadow-sm' : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300'}`}
            >
              <CheckCircle2 className="h-4 w-4" /> Approved
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending-leaves')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'pending-leaves' ? 'bg-amber-500 text-white shadow-sm' : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300'}`}
            >
              <Hourglass className="h-4 w-4" /> Pending
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rejected-leaves')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'rejected-leaves' ? 'bg-rose-500 text-white shadow-sm' : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300'}`}
            >
              <XCircle className="h-4 w-4" /> Rejected
            </button>
          </div>
        </div>

        {activeTab === 'approved-leaves' && (
          <div className="p-6">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-zinc-900"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Approved Leaves</h3>
            {approvedLeaves.length === 0 ? (
              <EmptyState className="mt-4" title="No approved leaves yet" />
            ) : (
              <motion.div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" variants={listV} initial="hidden" animate="show">
                {approvedLeaves.map((request) => (
                  <motion.div key={request.id} variants={itemV} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{request.leaveType || 'Leave'}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatDateTime(request.requestedAt || request.createdAt || Date.now())}</p>
                      </div>
                      <Badge variant="success">Approved</Badge>
                    </div>
                    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                      <p><span className="text-zinc-400">Date range:</span> {request.startDate || request.start_date || '—'} to {request.endDate || request.end_date || '—'}</p>
                      <p><span className="text-zinc-400">Reason:</span> {request.reason || 'No reason provided'}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'pending-leaves' && (
          <div className="p-6">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-zinc-900"><Hourglass className="w-5 h-5 text-amber-600" /> Pending Leaves</h3>
            {pendingLeaves.length === 0 ? (
              <EmptyState className="mt-4" title="No pending leaves right now" />
            ) : (
              <motion.div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" variants={listV} initial="hidden" animate="show">
                {pendingLeaves.map((request) => (
                  <motion.div key={request.id} variants={itemV} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-900">{request.leaveType || 'Leave'}</p>
                      <Badge variant="warning">Pending</Badge>
                    </div>
                    <p className="mt-4 border-t border-zinc-100 pt-3 text-sm text-zinc-700">{request.startDate || request.start_date || '—'} to {request.endDate || request.end_date || '—'}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'rejected-leaves' && (
          <div className="p-6">
            <h3 className="flex items-center gap-2 font-heading text-base font-bold text-zinc-900"><XCircle className="w-5 h-5 text-rose-600" /> Rejected Leaves</h3>
            {rejectedLeaves.length === 0 ? (
              <EmptyState className="mt-4" title="No rejected leaves yet" />
            ) : (
              <motion.div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3" variants={listV} initial="hidden" animate="show">
                {rejectedLeaves.map((request) => (
                  <motion.div key={request.id} variants={itemV} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{request.leaveType || 'Leave'}</p>
                      </div>
                      <Badge variant="danger">Rejected</Badge>
                    </div>
                    <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                      <p><span className="text-zinc-400">Date range:</span> {request.startDate || request.start_date || '—'} to {request.endDate || request.end_date || '—'}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
