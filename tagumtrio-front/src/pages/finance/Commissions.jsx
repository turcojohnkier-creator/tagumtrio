import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpDown, CalendarRange, FilterX, ListFilter, ReceiptText, Users, FileText, Banknote, Warehouse } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import ReportsView from '../../components/reports/ReportsView'
import { useEffect, useCallback } from 'react'
import { fetchPayrollCyclesApi, fetchPayrollCycleDetailsApi, releasePayrollApi, fetchPayrollPaymentsApi } from '../../lib/api'

export default function Commissions() {
  const { user } = useAuth()
  const { getFinanceRecords, getFinanceEmployees, getFinanceEmployeeHistory, getFinancePayrollCycles, formatDateTime, payrollCycleLabel } = useQr()
  const [cycles, setCycles] = useState([])
  const [selectedCycle, setSelectedCycle] = useState(null)
  const [cycleDetails, setCycleDetails] = useState([])
  const [releasedPayments, setReleasedPayments] = useState([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [sortDirection, setSortDirection] = useState('desc')

  const employees = getFinanceEmployees()
  const allRecords = useMemo(() => {
    const records = selectedEmployeeId ? getFinanceEmployeeHistory(selectedEmployeeId) : getFinanceRecords()
    return records.slice().sort((a, b) => {
      const dateCompare = new Date(a.scannedAt) - new Date(b.scannedAt)
      return sortDirection === 'asc' ? dateCompare : -dateCompare
    })
  }, [getFinanceEmployeeHistory, getFinanceRecords, selectedEmployeeId, sortDirection])

  const selectedEmployee = employees.find((employee) => String(employee.employeeId) === String(selectedEmployeeId))
  // server cycles are loaded into `cycles` state; provider fallback used on fetch failure

  useEffect(() => {
    let cancelled = false
    async function loadCycles() {
      try {
        const remote = await fetchPayrollCyclesApi()
        if (!cancelled && Array.isArray(remote)) setCycles(remote)
      } catch {
        // fallback to provider cycles
        if (!cancelled) setCycles(getFinancePayrollCycles())
      }
    }
    loadCycles()
    return () => { cancelled = true }
  }, [getFinancePayrollCycles])

  const loadCycleDetails = useCallback(async (key) => {
    try {
      const details = await fetchPayrollCycleDetailsApi(key)
      setCycleDetails(details || [])
    } catch (e) {
      setCycleDetails([])
    }
  }, [])

  async function handleRelease(cycleKey) {
    try {
      const created = await releasePayrollApi({ cycleKey })
      // refresh payments list
      const payments = await fetchPayrollPaymentsApi()
      setReleasedPayments(Array.isArray(payments) ? payments : [])
      return created
    } catch (e) {
      throw e
    }
  }

  const summary = useMemo(() => {
    return allRecords.reduce(
      (accumulator, record) => {
        accumulator.hours += Number(record.loggedHours || 0)
        accumulator.amount += Number(record.amount || 0)
        accumulator.departments.add(record.department)
        accumulator.employees.add(record.employeeId)
        return accumulator
      },
      { hours: 0, amount: 0, departments: new Set(), employees: new Set() }
    )
  }, [allRecords])

  const canViewDailyReports = user?.role === 'hr' || user?.role === 'production_incharge' || user?.role === 'admin'

  function clearFilter() {
    setSelectedEmployeeId('')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 w-full">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <ReceiptText className="h-3.5 w-3.5" />
              Finance Payroll Dashboard
            </div>
            <h2 className="text-3xl font-bold text-white">Company payroll and commission logs</h2>
            <p className="text-sm leading-6 text-slate-400">
              View every employee log, sort by name, filter to a single employee, and review the 15-day payroll cycle before release.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Employees</p>
              <p className="mt-1 text-xl font-bold text-white">{summary.employees.size || employees.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Logs</p>
              <p className="mt-1 text-xl font-bold text-white">{allRecords.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Amount</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">₱{summary.amount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/app/payroll" className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            <Banknote className="h-4 w-4" /> Overview
          </Link>
          <Link to="/app/payroll/reports" className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-slate-700">
            <FileText className="h-4 w-4" /> Daily Reports
          </Link>
          <Link to="/app/payroll/archive" className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-slate-700">
            <CalendarRange className="h-4 w-4" /> Archive
          </Link>
          <Link to="/app/employees" className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-slate-700">
            <Warehouse className="h-4 w-4" /> Employee Records
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Employee salary log</h3>
              <p className="text-sm text-slate-400">Names repeat when employees move departments. Filter any employee to review the exact payroll history.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[240px] flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
                <label className="text-[11px] uppercase tracking-wider text-slate-500">Filter employee</label>
                <select
                  value={selectedEmployeeId}
                  onChange={(event) => setSelectedEmployeeId(event.target.value)}
                  className="mt-1 w-full bg-slate-950 text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-slate-950 text-white">All employees</option>
                  {employees.map((employee) => (
                    <option key={employee.employeeId} value={String(employee.employeeId)} className="bg-slate-950 text-white">{employee.employeeName}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'))}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 hover:border-slate-700"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortDirection === 'desc' ? 'Newest first' : 'Oldest first'}
              </button>

              <button
                type="button"
                onClick={clearFilter}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 hover:border-slate-700"
              >
                <FilterX className="h-4 w-4" />
                Clear
              </button>

              <Link to="/app/payroll/archive" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400">
                <CalendarRange className="h-4 w-4" />
                Archive
              </Link>
            </div>
          </div>

          {selectedEmployee && (
            <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              Showing full 15-day payroll history for <strong>{selectedEmployee.employeeName}</strong>. Remove the filter to restore the company-wide list.
            </div>
          )}

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
                {allRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payroll logs available.</td>
                  </tr>
                ) : (
                  allRecords.map((record) => (
                    <tr key={record.id} className="text-slate-300 hover:bg-slate-900/80">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{record.employeeName}</div>
                        <div className="text-xs text-slate-500">{record.employeeId}</div>
                      </td>
                      <td className="px-4 py-4">{record.department}</td>
                      <td className="px-4 py-4">
                        <div>{formatDateTime(record.scannedAt)}</div>
                        <div className="text-xs text-slate-500">{payrollCycleLabel(record.scannedAt)}</div>
                      </td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">₱{Number(record.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          {canViewDailyReports ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-white">Submitted Daily Reports</h3>
              <div className="mt-4">
                <ReportsView />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
              <h3 className="text-lg font-semibold text-white">Submitted Daily Reports</h3>
              <p className="mt-4 text-sm text-slate-400">Daily reports are reserved for production incharged and admin.</p>
            </div>
          )}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Employee index</h3>
            </div>
            <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {employees.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">No employees found.</div>
              ) : (
                employees.map((employee) => {
                  const employeeTotal = getFinanceEmployeeHistory(employee.employeeId).reduce((sum, record) => sum + Number(record.amount || 0), 0)
                  return (
                    <button
                      key={employee.employeeId}
                      type="button"
                      onClick={() => setSelectedEmployeeId(String(employee.employeeId))}
                      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${String(selectedEmployeeId) === String(employee.employeeId) ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">{employee.employeeName}</div>
                          <div className="text-xs text-slate-500">{employee.employeeId}</div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div>{getFinanceEmployeeHistory(employee.employeeId).length} logs</div>
                          <div className="text-emerald-400 font-semibold">₱{employeeTotal.toLocaleString()}</div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-amber-400" />
              <h3 className="text-lg font-semibold text-white">15-day cycle snapshot</h3>
            </div>
            <div className="mt-4 space-y-2">
              {(!cycles || cycles.length === 0) ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">No cycles available.</div>
              ) : (
                cycles.slice(0, 8).map((cycle) => (
                  <div key={cycle.key} className="block rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 hover:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{cycle.label}</div>
                        <div className="text-xs text-slate-500">{cycle.employeeCount} employees</div>
                      </div>
                      <div className="text-right text-sm flex items-center gap-2">
                        <div className="text-emerald-400 font-semibold">₱{Number(cycle.totalAmount || 0).toLocaleString()}</div>
                        <button onClick={() => { setSelectedCycle(cycle.key); loadCycleDetails(cycle.key) }} className="rounded-lg bg-slate-800 px-3 py-2 text-sm">Details</button>
                        <button onClick={() => handleRelease(cycle.key)} className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black">Release</button>
                      </div>
                    </div>
                    {selectedCycle === cycle.key && (
                      <div className="mt-3">
                        {cycleDetails.length === 0 ? (
                          <div className="text-sm text-slate-400">No records for this cycle.</div>
                        ) : (
                          <div className="grid gap-2">
                            {cycleDetails.map((r) => (
                              <div key={r.id} className="bg-slate-900 p-2 rounded-md border border-slate-800">
                                <div className="text-sm text-white font-medium">{r.employeeName} — {r.department}</div>
                                <div className="text-xs text-slate-400">₱{Number(r.amount || 0).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}