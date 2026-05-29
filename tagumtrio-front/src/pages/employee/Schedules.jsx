import { CalendarDays } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'

function formatDateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function toDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export default function EmployeeWorkDetails() {
  const { user } = useAuth()
  const { getEmployeeDepartment, getFinanceRecords } = useQr()

  const currentDepartment = getEmployeeDepartment(user?.id) || user?.department || 'Unassigned'
  const todayKey = new Date().toISOString().slice(0, 10)
  const workRecords = Array.isArray(getFinanceRecords?.()) ? getFinanceRecords() : []
  const departmentRecords = workRecords.filter((record) => String(record.department || '').trim().toLowerCase() === String(currentDepartment).trim().toLowerCase())
  const todayRecords = departmentRecords.filter((record) => toDateKey(record.scannedAt || record.reportDate || record.createdAt) === todayKey)
  const visibleRecords = todayRecords.length > 0 ? todayRecords : departmentRecords

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Employee Portal</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Work Details</h2>
        <p className="mt-1 text-sm text-slate-400">Your assigned section and daily work details by department.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950 p-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Assigned Section Today</p>
          <p className="mt-2 text-2xl font-bold text-white">{currentDepartment}</p>
          <p className="mt-1 text-sm text-slate-400">This section is based on your active department for the day.</p>
        </div>

        {visibleRecords.length > 0 ? (
          <div className="space-y-3">
            {visibleRecords.slice(0, 8).map((record) => (
              <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-white">{record.department || currentDepartment}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {record.product || record.productName || record.section || 'Department work item'}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      <span className="text-slate-500">Time:</span> {formatDateTime(record.scannedAt || record.reportDate || record.createdAt || new Date().toISOString())}
                    </p>
                    <p className="text-sm text-slate-300">
                      <span className="text-slate-500">Details:</span> {record.summary || record.qrSummary || record.notes || 'No details recorded.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
            No department work details are available yet.
          </div>
        )}
      </div>
    </div>
  )
}
