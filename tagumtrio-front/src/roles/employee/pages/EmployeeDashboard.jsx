import { useEffect, useState } from 'react'
import { Briefcase, Calendar as CalendarIcon, FileText, Megaphone, TimerReset, ChevronRight } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useQr } from '../../../context/qr-context'
import { useDialog } from '../../../context/dialog-context'
import AnnouncementPost from '../../../shared/ui/AnnouncementPost'

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
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-between p-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-medium transition-colors">
        <span>File Leave</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-lg rounded-xl bg-white border border-slate-200 p-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4">File a Leave Request</h4>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-slate-700">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900">
                <option>Sick</option>
                <option>Vacation</option>
                <option>Emergency</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-700">Start</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900" />
                </div>
                <div>
                  <label className="text-sm text-slate-700">End</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900" />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-700">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900" />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-medium">{submitting ? 'Sending…' : 'Submit Request'}</button>
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
    getEmployeeAttendance,
    submitLeaveRequest,
    getUnseenEmployeeReassignmentNotifications,
    markReassignmentNotificationsSeen,
  } = useQr()
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
  const attendance = getEmployeeAttendance(user?.id)
  const latestRecord = totals.latestRecord
  

  

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-2xl font-semibold text-slate-700 border-4 border-slate-200 shadow-xl">JD</div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{user?.name || 'Employee'}</h2>
              <p className="text-emerald-700 font-medium mt-1">{currentDepartment ? `${currentDepartment} Department` : 'Department not yet assigned'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> ID: {user?.id || '—'}</span>
                <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> Current hour log sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)] gap-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-700" /> Quick Actions</h3>
            <div className="space-y-3">
              <FileLeaveButton user={user} onSubmit={submitLeaveRequest} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><TimerReset className="w-5 h-5 text-emerald-700" /> Snapshot</h3>
            <div className="space-y-3 text-sm text-slate-500">
              <p>Total earned: <span className="text-slate-900">₱{totals.totalAmount.toLocaleString()}</span></p>
              <p>Latest scanned department: <span className="text-slate-900">{latestRecord?.department || 'None'}</span></p>
              <p>Use the left sidebar to open request history and payslip details.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
