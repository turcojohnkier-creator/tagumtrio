import { useState } from 'react'
import { Briefcase, Calendar as CalendarIcon, Clock, FileText, Hourglass } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import { toManilaDateKey } from '../../../lib/datetime'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'

const MONTHLY_LEAVE_LIMIT = 3

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
    <form onSubmit={handleSubmit} className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="text-sm font-medium text-zinc-700">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
          <option>Sick</option>
          <option>Vacation</option>
          <option>Emergency</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-zinc-700">Start</label>
        <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-700">End</label>
        <input type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
      </div>

      <div className="sm:col-span-2">
        <label className="text-sm font-medium text-zinc-700">Reason</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none" />
      </div>

      <div className="flex items-center justify-end sm:col-span-2">
        <Button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Submit Request'}</Button>
      </div>
    </form>
  )
}

function LeaveWidget({ icon: Icon, iconClassName, value, label, hint }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${iconClassName}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="mt-3 font-heading text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-zinc-700">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-zinc-400">{hint}</p> : null}
    </div>
  )
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const {
    getEmployeeDepartment,
    getEmployeeTotals,
    getEmployeeLeaveRequests,
    submitLeaveRequest,
  } = useAppData()

  // Reassignment popups are now handled globally in AppDataProvider (backend-
  // backed notifications), so they fire from anywhere, not just on this mount.

  const currentDepartment = user?.department || getEmployeeDepartment(user?.id)
  const totals = getEmployeeTotals(user?.id)

  const leaveRequests = getEmployeeLeaveRequests(user?.id)
  const now = new Date()
  const requestsThisMonth = leaveRequests.filter((request) => {
    const requested = new Date(request.requestedAt || request.requested_at)
    if (Number.isNaN(requested.getTime())) return false
    return requested.getFullYear() === now.getFullYear() && requested.getMonth() === now.getMonth()
  })
  const usedThisMonth = requestsThisMonth.length
  const remainingThisMonth = Math.max(0, MONTHLY_LEAVE_LIMIT - usedThisMonth)
  const limitReached = usedThisMonth >= MONTHLY_LEAVE_LIMIT

  const typeBreakdown = requestsThisMonth.reduce((accumulator, request) => {
    const key = String(request.leaveType || 'Other').toLowerCase()
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})
  const typeSummary = Object.entries(typeBreakdown).map(([key, count]) => `${count} ${key}`).join(' · ')

  const pendingCount = leaveRequests.filter((request) => String(request.status).toLowerCase() === 'pending').length

  const todayKey = toManilaDateKey()
  const activeLeave = leaveRequests.find((request) => (
    String(request.status).toLowerCase() === 'approved'
    && request.startDate
    && request.endDate
    && todayKey >= request.startDate
    && todayKey <= request.endDate
  ))

  let timeLeftValue = '—'
  let timeLeftLabel = 'Days left on leave'
  let timeLeftHint = 'Not currently on leave'
  if (activeLeave) {
    const endOfLeave = new Date(`${activeLeave.endDate}T23:59:59`)
    const hoursLeft = (endOfLeave.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursLeft <= 24) {
      const hours = Math.max(0, Math.ceil(hoursLeft))
      timeLeftValue = hours
      timeLeftLabel = hours === 1 ? 'Hour left on leave' : 'Hours left on leave'
      timeLeftHint = `${activeLeave.leaveType} leave ends today`
    } else {
      const days = Math.ceil(hoursLeft / 24)
      timeLeftValue = days
      timeLeftLabel = days === 1 ? 'Day left on leave' : 'Days left on leave'
      timeLeftHint = `${activeLeave.leaveType} leave ends ${activeLeave.endDate}`
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-700 bg-emerald-700 p-6 shadow-sm">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white ring-4 ring-white/20">
              {String(user?.name || 'EM').split(' ').map((p) => p[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-white">{user?.name || 'Employee'}</h2>
              <p className="mt-1 font-semibold text-emerald-50">{currentDepartment ? `${currentDepartment} Department` : 'Department not yet assigned'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-emerald-50/80">
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> ID: {user?.id || '—'}</span>
                <span className="flex items-center gap-1.5"><CalendarIcon className="h-4 w-4" /> Reports update in real time</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-50/80">Total earned today</p>
            <p className="mt-1 font-heading text-2xl font-bold tabular-nums text-white">₱{totals.totalToday.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <LeaveWidget
          icon={CalendarIcon}
          iconClassName="bg-violet-50 text-violet-600"
          value={remainingThisMonth}
          label="Leave Requests Left"
          hint={usedThisMonth > 0 ? `${typeSummary} this month` : 'No requests yet this month'}
        />
        <LeaveWidget
          icon={Clock}
          iconClassName="bg-amber-50 text-amber-600"
          value={pendingCount}
          label="Pending Requests"
          hint="Awaiting approval"
        />
        <LeaveWidget
          icon={Hourglass}
          iconClassName="bg-emerald-50 text-emerald-600"
          value={timeLeftValue}
          label={timeLeftLabel}
          hint={timeLeftHint}
        />
      </div>

      <Card>
        <SectionTitle icon={FileText}>File a Leave Request</SectionTitle>
        {limitReached ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You've used all {MONTHLY_LEAVE_LIMIT} leave requests for this month — try again next month.
          </p>
        ) : (
          <FileLeaveForm user={user} onSubmit={submitLeaveRequest} />
        )}
      </Card>
    </div>
  )
}
