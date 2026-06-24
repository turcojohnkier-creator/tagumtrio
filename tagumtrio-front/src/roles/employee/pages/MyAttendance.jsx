import { useMemo, useState, useCallback } from 'react'
import { ArrowLeft, CheckCircle2, Hourglass, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useQr } from '../../../context/qr-context'

export default function MyAttendance() {
  const { user } = useAuth()
  const { getEmployeeLeaveRequests, getEmployeeTotals, formatDateTime } = useQr()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('approved-leaves')

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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={() => navigate('/app/portal')} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> Back to overview
            </button>
            <h2 className="text-2xl font-bold text-slate-900">Leaves & Requests</h2>
            <p className="mt-1 text-sm text-slate-500">Track your leave requests, approved leaves, and department changes in one place.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Department</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{displayDept}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Leave requests</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{leaveRequests.length}</p>
            <div className="mt-2 space-y-1 text-xs text-slate-500">
              <p>{approvedLeaves.length} approved</p>
              <p>{pendingLeaves.length} pending</p>
              <p>{rejectedLeaves.length} rejected</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('approved-leaves')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'approved-leaves' ? 'bg-emerald-500 text-black' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
            >
              <CheckCircle2 className="h-4 w-4" /> Approved Leaves
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending-leaves')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'pending-leaves' ? 'bg-emerald-500 text-black' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
            >
              <Hourglass className="h-4 w-4" /> Pending Leaves
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rejected-leaves')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'rejected-leaves' ? 'bg-rose-500 text-black' : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'}`}
            >
              <XCircle className="h-4 w-4" /> Rejected Leaves
            </button>
          </div>
        </div>

        {activeTab === 'approved-leaves' && (
          <div className="p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><CheckCircle2 className="w-5 h-5 text-emerald-700" /> Approved Leaves</h3>
            {approvedLeaves.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No approved leaves yet.</div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {approvedLeaves.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{request.leaveType || 'Leave'}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatDateTime(request.requestedAt || request.createdAt || Date.now())}</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-700">Approved</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p><span className="text-slate-400">Date range:</span> {request.startDate || request.start_date || '—'} to {request.endDate || request.end_date || '—'}</p>
                      <p><span className="text-slate-400">Reason:</span> {request.reason || 'No reason provided'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'pending-leaves' && (
          <div className="p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><Hourglass className="w-5 h-5 text-amber-700" /> Pending Leaves</h3>
            {pendingLeaves.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No pending leaves right now.</div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {pendingLeaves.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-900">{request.leaveType || 'Leave'}</p>
                    <p className="mt-4 text-sm text-slate-700">{request.startDate || request.start_date || '—'} to {request.endDate || request.end_date || '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rejected-leaves' && (
          <div className="p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><XCircle className="w-5 h-5 text-rose-700" /> Rejected Leaves</h3>
            {rejectedLeaves.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No rejected leaves yet.</div>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {rejectedLeaves.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{request.leaveType || 'Leave'}</p>
                      </div>
                      <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-rose-700">Rejected</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p><span className="text-slate-400">Date range:</span> {request.startDate || request.start_date || '—'} to {request.endDate || request.end_date || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}