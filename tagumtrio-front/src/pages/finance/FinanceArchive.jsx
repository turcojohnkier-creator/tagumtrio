import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArchiveRestore, CalendarDays, ChevronLeft, ReceiptText } from 'lucide-react'
import { useQr } from '../../context/qr-context'

export default function FinanceArchive() {
  const { getFinancePayrollCycles, getFinancePayrollCycle, formatDateTime } = useQr()
  const [searchParams] = useSearchParams()
  const cycleFromQuery = searchParams.get('cycle') || ''
  const cycles = getFinancePayrollCycles()
  const [selectedCycleKey, setSelectedCycleKey] = useState(cycleFromQuery || cycles[0]?.key || '')

  const activeCycle = useMemo(() => {
    if (!selectedCycleKey) return null
    return getFinancePayrollCycle(selectedCycleKey)
  }, [getFinancePayrollCycle, selectedCycleKey])

  const cycleMeta = cycles.find((cycle) => cycle.key === selectedCycleKey)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <Link to="/app/payroll" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
              <ChevronLeft className="h-4 w-4" />
              Back to payroll dashboard
            </Link>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
              <ArchiveRestore className="h-3.5 w-3.5" />
              Payroll Archive
            </div>
            <h2 className="text-3xl font-bold text-white">15-day salary history archive</h2>
            <p className="text-sm leading-6 text-slate-400">
              Review archived payroll cycles, including all employee salary logs grouped by their 15-day release windows.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Cycles</p>
              <p className="mt-1 text-xl font-bold text-white">{cycles.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Current</p>
              <p className="mt-1 text-xl font-bold text-white">{cycleMeta?.label || 'None'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Employees</p>
              <p className="mt-1 text-xl font-bold text-white">{activeCycle?.employeeCount || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Amount</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">₱{Number(activeCycle?.totalAmount || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Archived cycles</h3>
          </div>
          <div className="mt-4 space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {cycles.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">No archived cycles yet.</div>
            ) : (
              cycles.map((cycle) => (
                <button
                  key={cycle.key}
                  type="button"
                  onClick={() => setSelectedCycleKey(cycle.key)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selectedCycleKey === cycle.key ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{cycle.label}</div>
                      <div className="text-xs text-slate-500">{cycle.employeeCount} employees • {cycle.records.length} logs</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>{formatDateTime(cycle.latestDate)}</div>
                      <div className="text-emerald-400 font-semibold">₱{cycle.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs uppercase tracking-wider text-slate-500">
                <ReceiptText className="h-3.5 w-3.5" />
                Salary archive detail
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{cycleMeta?.label || 'Select a cycle'}</h3>
              <p className="text-sm text-slate-400">All salary entries in this archive window.</p>
            </div>
            <div className="text-sm text-slate-300">
              <p>Employees: <span className="text-white font-medium">{activeCycle?.employeeCount || 0}</span></p>
              <p>Amount: <span className="text-emerald-400 font-semibold">₱{Number(activeCycle?.totalAmount || 0).toLocaleString()}</span></p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {!activeCycle || activeCycle.records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No records in this archive window.</td>
                  </tr>
                ) : (
                  activeCycle.records.map((record) => (
                    <tr key={record.id} className="text-slate-300 hover:bg-slate-900/80">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{record.employeeName}</div>
                        <div className="text-xs text-slate-500">{record.employeeId}</div>
                      </td>
                      <td className="px-4 py-4">{record.department}</td>
                      <td className="px-4 py-4">{formatDateTime(record.scannedAt)}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">₱{Number(record.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
