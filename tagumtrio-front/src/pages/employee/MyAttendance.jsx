import { ArrowLeft, BadgeCheck, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'

export default function MyAttendance() {
  const { user } = useAuth()
  const { getEmployeeDepartmentRequests, getEmployeeTotals, formatDateTime } = useQr()
  const navigate = useNavigate()

  const departmentRequests = getEmployeeDepartmentRequests(user?.id)
  const totals = getEmployeeTotals(user?.id)

  const pendingRequests = departmentRequests.filter((request) => request.status === 'pending')
  const approvedRequests = departmentRequests.filter((request) => request.status === 'approved')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={() => navigate('/app/portal')} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
              <ArrowLeft className="w-4 h-4" /> Back to overview
            </button>
            <h2 className="text-2xl font-bold text-white">Requests</h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Department</p>
            <p className="mt-2 text-lg font-semibold text-white">{totals.currentDepartment || 'Unassigned'}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Requests</p>
            <p className="mt-2 text-lg font-semibold text-white">{departmentRequests.length}</p>
            <p className="text-xs text-slate-500">{pendingRequests.length} pending</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-800 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><BadgeCheck className="w-5 h-5 text-emerald-400" /> Request History</h3>
          </div>
          {departmentRequests.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">No requests submitted yet.</div>
          ) : (
            <div className="divide-y divide-slate-800">
              {departmentRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{request.requestedDepartment}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(request.requestedAt)}</p>
                  </div>
                  <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium ${request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>
                    {request.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white"><FileText className="w-5 h-5 text-amber-400" /> Status Snapshot</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Approved requests: <span className="text-white">{approvedRequests.length}</span></p>
              <p>Pending requests: <span className="text-white">{pendingRequests.length}</span></p>
              <p>Latest update: <span className="text-white">{departmentRequests[0] ? formatDateTime(departmentRequests[0].requestedAt) : 'No recent update'}</span></p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">What stays here</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Use this page for your requests and approval status.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

