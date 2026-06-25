import { useMemo, useState } from 'react'
import { BadgeCheck, Search, X } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { DEPARTMENTS } from '../../../constants/departments'
import { useDialog } from '../../../context/dialog-context'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

function asText(value) {
  return String(value || '').toLowerCase()
}

function sameDepartment(left, right) {
  return asText(left).trim() === asText(right).trim()
}

export default function LeadmanTransfers() {
  const { user } = useAuth()
  const { departmentRequests, approveDepartmentRequest, redirectDepartmentRequest, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useAppData()
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
      <PageHeader
        eyebrow="Leadman queue"
        title="Transfer Requests"
        description="Approve requests or redirect mistaken transfers to the correct department. All pending requests are shown here."
        actions={(
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-1.5 min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        )}
      >
        <div className="max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search requests..." className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
      </PageHeader>

      <Card padding="p-0">
        <div className="border-b border-zinc-200 px-6 py-4">
          <SectionTitle icon={BadgeCheck}>Pending Requests for {selectedDepartment}</SectionTitle>
        </div>
        {selectedDepartmentRequests.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No pending transfer requests" description={`No pending transfer requests for ${selectedDepartment}.`} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-emerald-100 bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-zinc-700">Employee</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-700">ID</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-700">Department</th>
                  <th className="px-6 py-3 text-left font-medium text-zinc-700">Requested</th>
                  <th className="px-6 py-3 text-right font-medium text-zinc-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {selectedDepartmentRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-zinc-100/50">
                    <td className="px-6 py-4 text-zinc-900 font-medium">{request.employeeName}</td>
                    <td className="px-6 py-4 text-zinc-500">{request.employeeId}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
                        {request.requestedDepartment}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 text-xs">{formatDateTime(request.requestedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => handleTransferAction(request, 'approve')}>Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => handleTransferAction(request, 'redirect')}>Redirect</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {redirectOpen && redirectRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Close redirect request" className="absolute inset-0 bg-black/60" onClick={() => setRedirectOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-sm p-6 shadow-sm">
            <button type="button" onClick={() => setRedirectOpen(false)} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-900">
              <X className="h-5 w-5" />
            </button>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Redirect request</p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-900">Move this request to another department</h3>
            <p className="mt-2 text-sm text-zinc-500">
              {redirectRequest.employeeName} • {redirectRequest.employeeId}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-zinc-700">Target department</label>
                <select
                  value={redirectDepartment}
                  onChange={(e) => setRedirectDepartment(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none"
                >
                  {DEPARTMENTS.filter((department) => !sameDepartment(department, redirectRequest.requestedDepartment)).map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-700">Reason note</label>
                <textarea
                  value={redirectReason}
                  onChange={(e) => setRedirectReason(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none"
                  placeholder="Optional note for the correction"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setRedirectOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={redirectSubmitting || !redirectDepartment}
                onClick={submitRedirect}
              >
                {redirectSubmitting ? 'Redirecting...' : 'Confirm Redirect'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}