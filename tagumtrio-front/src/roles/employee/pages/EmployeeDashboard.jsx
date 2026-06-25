import { useEffect, useState } from 'react'
import { Briefcase, Calendar as CalendarIcon, FileText, TimerReset, ChevronRight } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import StatCard from '../../../shared/ui/StatCard'

function FileLeaveButton({ user, onSubmit }) {
  const dialog = useDialog()
  const [open, setOpen] = useState(false)
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
      setOpen(false)
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
    <div>
      <Button onClick={() => setOpen(true)} className="w-full justify-between">
        <span>File leave request</span>
        <ChevronRight className="h-4 w-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-lg rounded-lg border border-zinc-200 bg-white p-6">
            <h4 className="font-heading text-lg font-bold text-zinc-900 mb-4">File a leave request</h4>
            <div className="grid grid-cols-1 gap-3">
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

              <div className="flex items-center justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Submit Request'}</Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function toDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const {
    getEmployeeDepartment,
    getEmployeeTotals,
    submitLeaveRequest,
    getUnseenEmployeeReassignmentNotifications,
    markReassignmentNotificationsSeen,
  } = useAppData()
  const dialog = useDialog()

  useEffect(() => {
    if (!user?.id) return

    const unseen = getUnseenEmployeeReassignmentNotifications(user.id, user.id)
    if (unseen.length === 0) return

    dialog.success({
      title: unseen.length === 1 ? 'Department reassigned' : `${unseen.length} department updates`,
      message: unseen.map((item) => `You were reassigned from ${item.oldDepartment} to ${item.targetDepartment}`).join('. '),
    })
    markReassignmentNotificationsSeen(user.id, unseen.map((item) => item.id))
  }, [user?.id, dialog, getUnseenEmployeeReassignmentNotifications, markReassignmentNotificationsSeen])

  const currentDepartment = getEmployeeDepartment(user?.id)
  const totals = getEmployeeTotals(user?.id)
  const latestRecord = totals.latestRecord
  

  

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
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <Card>
            <SectionTitle icon={FileText}>Quick Actions</SectionTitle>
            <div className="space-y-3">
              <FileLeaveButton user={user} onSubmit={submitLeaveRequest} />
            </div>
          </Card>

          <Card>
            <SectionTitle icon={TimerReset}>Snapshot</SectionTitle>
            <StatCard label="Total earned" value={`₱${totals.totalAmount.toLocaleString()}`} highlight />
            <dl className="mt-3 divide-y divide-zinc-100 text-sm">
              <div className="flex items-center justify-between py-2">
                <dt className="text-zinc-500">Latest report department</dt>
                <dd className="font-medium text-zinc-900">{latestRecord?.department || 'None'}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-zinc-400">Use the navigation above to open request history and payslip details.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
