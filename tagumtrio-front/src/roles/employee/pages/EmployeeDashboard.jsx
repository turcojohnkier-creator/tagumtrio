import { useState } from 'react'
import { Briefcase, Calendar as CalendarIcon, FileText } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'

function FileLeaveForm({ user, onSubmit }) {
  const dialog = useDialog()
  const [type, setType] = useState('Sick')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    try {
      await Promise.resolve(onSubmit({
        employeeId: user.id,
        employeeName: user.name,
        leaveType: type,
        startDate,
        endDate,
        reason,
      }))
      setType('Sick')
      setStartDate('')
      setEndDate('')
      setReason('')
      dialog.success({
        title: 'Leave request submitted',
        message: 'Your leave request was sent successfully and is waiting for approval.',
      })
    } catch (error) {
      dialog.error({
        title: 'Leave request failed',
        message: error?.message || 'Unable to submit leave request right now.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto grid w-full max-w-md grid-cols-1 gap-3">
      <label className="text-sm font-medium text-zinc-700">Type</label>
      <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
        <option>Sick</option>
        <option>Vacation</option>
        <option>Emergency</option>
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-zinc-700">Start</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700">End</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700">Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Submit Request'}</Button>
      </div>
    </form>
  )
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const {
    getEmployeeDepartment,
    getEmployeeTotals,
    submitLeaveRequest,
  } = useAppData()

  // Reassignment popups are now handled globally in AppDataProvider (backend-
  // backed notifications), so they fire from anywhere, not just on this mount.

  const currentDepartment = user?.department || getEmployeeDepartment(user?.id)
  const totals = getEmployeeTotals(user?.id)

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-700 ring-4 ring-emerald-100">
              {String(user?.name || 'EM').split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-zinc-900">{user?.name || 'Employee'}</h2>
              <p className="mt-1 font-semibold text-emerald-600">{currentDepartment ? `${currentDepartment} Department` : 'Department not yet assigned'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> ID: {user?.id || '—'}</span>
                <span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" /> Reports update in real time</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Total earned today</p>
            <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-emerald-700">₱{totals.totalToday.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <SectionTitle icon={FileText}>Quick Actions</SectionTitle>
          <FileLeaveForm user={user} onSubmit={submitLeaveRequest} />
        </Card>
      </div>
    </div>
  )
}
