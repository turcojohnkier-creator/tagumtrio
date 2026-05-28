import { useMemo, useState } from 'react'
import { BadgeCheck, Search, X } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import { DEPARTMENTS } from '../../constants/departments'
import { useDialog } from '../../context/dialog-context'

function asText(value) {
  return String(value || '').toLowerCase()
}

function sameDepartment(left, right) {
  return asText(left).trim() === asText(right).trim()
}

export default function LeadmanTransfers() {
  const { user } = useAuth()
  const { departmentRequests, approveDepartmentRequest, redirectDepartmentRequest, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useQr()
  const dialog = useDialog()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''
  const [query, setQuery] = useState('')
  const [redirectOpen, setRedirectOpen] = useState(false)
  const [redirectRequest, setRedirectRequest] = useState(null)
  const [redirectDepartment, setRedirectDepartment] = useState('')
  const [redirectReason, setRedirectReason] = useState('')
  const [redirectSubmitting, setRedirectSubmitting] = useState(false)

  const departmentTransferRequests = useMemo(() => {
    return departmentRequests
      .filter((request) => request.status === 'pending')
      .filter((request) => asText(request.employeeName).includes(asText(query)) || asText(request.employeeId).includes(asText(query)) || asText(request.requestedDepartment).includes(asText(query)))
  }, [departmentRequests, query])

  const selectedDepartmentRequests = useMemo(() => {
    return departmentTransferRequests.filter((request) => sameDepartment(request.requestedDepartment, selectedDepartment))
  }, [departmentTransferRequests, selectedDepartment])

  function handleTransferAction(request, action) {
    if (action === 'approve') {
      void (async () => {
        const confirmed = await dialog.confirm({
          title: 'Approve transfer request?',
          message: `Approve the transfer request for ${request.employeeName}?`,
          confirmText: 'Yes, approve',
          cancelText: 'Cancel',
        })
        if (!confirmed) return
        await approveDepartmentRequest(request.id, user?.id || 'LD-001')
        dialog.success({
          title: 'Transfer approved',
          message: `Transfer request for ${request.employeeName} was approved successfully.`,
        })
      })().catch((error) => {
        dialog.error({
          title: 'Approval failed',
          message: error?.message || 'Unable to approve the request right now.',
        })
      })
      return
    }

    if (action === 'redirect') {
      const fallbackDepartment = DEPARTMENTS.find((department) => !sameDepartment(department, request.requestedDepartment)) || ''
      setRedirectRequest(request)
      setRedirectDepartment(fallbackDepartment)
      setRedirectReason('')
      setRedirectOpen(true)
    }
  }

  async function submitRedirect() {
    if (!redirectRequest || !redirectDepartment) return

    setRedirectSubmitting(true)
    try {
      await redirectDepartmentRequest(redirectRequest.id, redirectDepartment, user?.id || 'LD-001', redirectReason.trim() || undefined)
      setRedirectOpen(false)
      setRedirectRequest(null)
      setRedirectReason('')
      dialog.success({
        title: 'Request redirected',
        message: `Transfer request was redirected to ${redirectDepartment} successfully.`,
      })
    } catch {
      dialog.error({
        title: 'Redirect failed',
        message: 'Unable to redirect the request right now. Please try again.',
      })
    } finally {
      setRedirectSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Leadman queue</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Transfer Requests</h2>
            <p className="mt-1 text-sm text-slate-400">Approve requests or redirect mistaken transfers to the correct department. All pending requests are shown here.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-2 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search requests..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><BadgeCheck className="h-5 w-5 text-emerald-400" /> Pending Requests for {selectedDepartment}</h3>
        </div>
        {selectedDepartmentRequests.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No pending transfer requests for {selectedDepartment}.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-800 bg-slate-950">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-300">Employee</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-300">ID</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-300">Department</th>
                  <th className="px-6 py-3 text-left font-medium text-slate-300">Requested</th>
                  <th className="px-6 py-3 text-right font-medium text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {selectedDepartmentRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-800/50">
                    <td className="px-6 py-4 text-white font-medium">{request.employeeName}</td>
                    <td className="px-6 py-4 text-slate-400">{request.employeeId}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                        {request.requestedDepartment}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{formatDateTime(request.requestedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleTransferAction(request, 'approve')} className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-emerald-400">Approve</button>
                        <button onClick={() => handleTransferAction(request, 'redirect')} className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700">Redirect</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {redirectOpen && redirectRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Close redirect request" className="absolute inset-0 bg-black/60" onClick={() => setRedirectOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <button type="button" onClick={() => setRedirectOpen(false)} className="absolute right-4 top-4 text-slate-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Redirect request</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Move this request to another department</h3>
            <p className="mt-2 text-sm text-slate-400">
              {redirectRequest.employeeName} • {redirectRequest.employeeId}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-slate-300">Target department</label>
                <select
                  value={redirectDepartment}
                  onChange={(e) => setRedirectDepartment(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {DEPARTMENTS.filter((department) => !sameDepartment(department, redirectRequest.requestedDepartment)).map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-slate-300">Reason note</label>
                <textarea
                  value={redirectReason}
                  onChange={(e) => setRedirectReason(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Optional note for the correction"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setRedirectOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={redirectSubmitting || !redirectDepartment}
                onClick={submitRedirect}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {redirectSubmitting ? 'Redirecting...' : 'Confirm Redirect'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}