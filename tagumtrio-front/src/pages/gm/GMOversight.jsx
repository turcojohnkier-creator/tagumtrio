import { useMemo, useState } from 'react'
import { DEPARTMENTS } from '../../constants/departments'
import { ChevronDown, Users, Clock3, FileText } from 'lucide-react'

const EMPLOYEE_PLACEHOLDERS = [
  { name: 'Employee A', salary: '₱0.00' },
  { name: 'Employee B', salary: '₱0.00' },
  { name: 'Employee C', salary: '₱0.00' },
  { name: 'Employee D', salary: '₱0.00' },
]

export default function GMOversight() {
  const [selectedDepartment, setSelectedDepartment] = useState(DEPARTMENTS[0] || 'Rotary')

  const employeeTotal = useMemo(() => {
    return EMPLOYEE_PLACEHOLDERS.reduce((sum, employee) => sum + 0, 0)
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Users className="h-3.5 w-3.5" />
              Oversight
            </p>
            <div>
              <h1 className="text-3xl font-bold text-white">{selectedDepartment} Department Oversight</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Select a department to review the active leadman, daily scan volume, and salary accumulation for the current day.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
            <label className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Department</label>
            <div className="mt-2 relative">
              <select
                value={selectedDepartment}
                onChange={(event) => setSelectedDepartment(event.target.value)}
                className="w-full appearance-none rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              >
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Active leadman</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">TBD leadman</h2>
              <p className="mt-2 text-sm text-slate-400">Assigned to {selectedDepartment}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-cyan-300">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scans today</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">0</h2>
              <p className="mt-2 text-sm text-slate-400">Total cards scanned for {selectedDepartment}</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-slate-200">
              <Clock3 className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Salary total</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">₱0.00</h2>
              <p className="mt-2 text-sm text-slate-400">Accumulated for {selectedDepartment} today</p>
            </div>
            <div className="rounded-2xl bg-slate-950 p-3 text-slate-200">
              <FileText className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Employee salary overview</p>
            <h2 className="mt-2 text-lg font-semibold text-white">{selectedDepartment} employees</h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-400">
            Total salary: <span className="font-semibold text-white">₱{employeeTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/80">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Accumulated salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950 text-slate-300">
              {EMPLOYEE_PLACEHOLDERS.map((employee) => (
                <tr key={employee.name} className="hover:bg-slate-900/70">
                  <td className="px-4 py-4">{employee.name}</td>
                  <td className="px-4 py-4 text-slate-400">{selectedDepartment}</td>
                  <td className="px-4 py-4 font-semibold text-white">{employee.salary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
