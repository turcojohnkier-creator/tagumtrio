import { useState } from 'react'
import { useQr } from '../../context/qr-context'
import { DEPARTMENTS } from '../../constants/departments'

export default function Schedules() {
  const { schedules = [], createSchedule, updateSchedule, removeSchedule } = useQr()
  const [department, setDepartment] = useState(DEPARTMENTS[0] || '')
  const [employeeId, setEmployeeId] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createSchedule({ department, employeeId: employeeId || null, startAt, endAt })
      setEmployeeId('')
      setStartAt('')
      setEndAt('')
    } catch (err) {
      console.error(err)
      alert('Failed to create schedule')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Schedules</h2>
        <p className="text-slate-400 mt-1">Assign shifts to departments or specific employees.</p>
      </div>

      <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="grid gap-3">
          <label className="text-sm text-slate-300">Department</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-white">
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <label className="text-sm text-slate-300">Employee ID (optional)</label>
          <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Employee ID" className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-white" />

          <label className="text-sm text-slate-300">Start (ISO datetime)</label>
          <input value={startAt} onChange={(e) => setStartAt(e.target.value)} placeholder="2026-05-29T08:00:00" className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-white" />

          <label className="text-sm text-slate-300">End (ISO datetime)</label>
          <input value={endAt} onChange={(e) => setEndAt(e.target.value)} placeholder="2026-05-29T17:00:00" className="w-full p-3 rounded bg-slate-950 border border-slate-800 text-white" />

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded bg-emerald-500 text-black">{submitting ? 'Saving...' : 'Create Shift'}</button>
          </div>
        </div>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Existing schedules</h3>
        {schedules.length === 0 ? (
          <div className="text-sm text-slate-400">No schedules yet.</div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="p-3 rounded border border-slate-800 bg-slate-950 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{s.department} {s.employeeId ? `• ${s.employeeId}` : ''}</div>
                  <div className="text-xs text-slate-400">{s.startAt} → {s.endAt}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => removeSchedule(s.id)} className="text-xs text-rose-400">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
