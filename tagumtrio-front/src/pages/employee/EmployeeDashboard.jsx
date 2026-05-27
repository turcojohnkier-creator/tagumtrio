import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Calendar as CalendarIcon, FileText, Megaphone, BadgeCheck, TimerReset, ChevronRight } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import { DEPARTMENTS } from '../../constants/departments'

function FileLeaveButton({ user, onSubmit }) {
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
      onSubmit({
        employeeId: user.id,
        employeeName: user.name,
        leaveType: type,
        startDate,
        endDate,
        reason,
      })
      setOpen(false)
      setType('Sick')
      setStartDate('')
      setEndDate('')
      setReason('')
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
          <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-lg rounded-xl bg-slate-900 border border-slate-800 p-6">
            <h4 className="text-lg font-semibold text-white mb-4">File a Leave Request</h4>
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-slate-300">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white">
                <option>Sick</option>
                <option>Vacation</option>
                <option>Emergency</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300">Start</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-300">End</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white" />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-medium">{submitting ? 'Sending…' : 'Submit Request'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function EmployeeDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    submitDepartmentRequest,
    getEmployeeDepartment,
    getEmployeeDepartmentRequests,
    getEmployeeTotals,
    formatDateTime,
    getEmployeeAttendance,
    submitLeaveRequest,
  } = useQr()

  const [requestedDepartment, setRequestedDepartment] = useState(DEPARTMENTS[0])
  const [confirmRequestOpen, setConfirmRequestOpen] = useState(false)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const currentDepartment = getEmployeeDepartment(user?.id)
  const departmentRequests = getEmployeeDepartmentRequests(user?.id)
  const totals = getEmployeeTotals(user?.id)
  const attendance = getEmployeeAttendance(user?.id)
  const latestRecord = totals.latestRecord
  const approvedRequests = departmentRequests.filter((request) => request.status === 'approved')
  const pendingRequests = departmentRequests.filter((request) => request.status === 'pending')

  async function submitDepartmentTransferRequest() {
    if (!requestedDepartment || !user) return

    setRequestSubmitting(true)
    setRequestMessage('')
    setRequestError('')

    try {
      await submitDepartmentRequest({
        employeeId: user.id,
        employeeName: user.name,
        requestedDepartment,
      })
      setRequestMessage(`Request sent for ${requestedDepartment}.`)
      setConfirmRequestOpen(false)
    } catch (error) {
      setRequestError(error?.message || 'Unable to send request right now.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/10 pointer-events-none"></div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-slate-300 border-4 border-slate-950 shadow-xl">JD</div>
            <div>
              <h2 className="text-3xl font-bold text-white">{user?.name || 'Employee'}</h2>
              <p className="text-emerald-400 font-medium mt-1">{currentDepartment ? `${currentDepartment} Department` : 'Department not yet assigned'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
                <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> ID: {user?.id || '—'}</span>
                <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> Current hour log sync</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-slate-300 max-w-md">
            
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)] gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-400" /> Department Request</h3>

          </div>
          <form onSubmit={(event) => event.preventDefault()} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Select Department</label>
                <select value={requestedDepartment} onChange={(e) => setRequestedDepartment(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500">
                  {DEPARTMENTS.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Current Department</label>
                <div className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white min-h-[44px] flex items-center">
                  {currentDepartment || 'No active department yet'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-400">Once submitted, your leadman approves the placement before scans are logged.</p>
              <button type="button" onClick={() => setConfirmRequestOpen(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg font-medium transition-colors">
                Send Request <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </form>
          {requestMessage ? <p className="mt-3 text-sm text-emerald-400">{requestMessage}</p> : null}
          {requestError ? <p className="mt-3 text-sm text-rose-400">{requestError}</p> : null}
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400" /> Quick Actions</h3>
            <div className="space-y-3">
              <FileLeaveButton user={user} onSubmit={submitLeaveRequest} />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><TimerReset className="w-5 h-5 text-emerald-400" /> Snapshot</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Total earned: <span className="text-white">₱{totals.totalAmount.toLocaleString()}</span></p>
              <p>Latest scanned department: <span className="text-white">{latestRecord?.department || 'None'}</span></p>
              <p>Use the left sidebar to open request history and payslip details.</p>
            </div>
          </div>
        </div>
      </div>

      {confirmRequestOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Close request confirmation" className="absolute inset-0 bg-black/60" onClick={() => setConfirmRequestOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Confirm request</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Send transfer request?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This will submit a department transfer request for <span className="font-medium text-slate-200">{requestedDepartment}</span>.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Current department: <span className="font-medium text-slate-200">{currentDepartment || 'None'}</span>
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setConfirmRequestOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
                Cancel
              </button>
              <button
                type="button"
                disabled={requestSubmitting}
                onClick={submitDepartmentTransferRequest}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {requestSubmitting ? 'Sending...' : 'Confirm Send'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
