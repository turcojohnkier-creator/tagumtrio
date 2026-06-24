import { Link } from 'react-router-dom'
import { BarChart3, CalendarDays, LayoutDashboard, Users } from 'lucide-react'
import { useMemo } from 'react'
import { useQr } from '../../../context/qr-context'

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-lg shadow-black/10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default function FinanceHome() {
  const { getFinanceEmployees, getFinanceRecords } = useQr()

  const stats = useMemo(() => {
    const employees = getFinanceEmployees()
    const reports = getFinanceRecords()
    const departments = new Set(employees.map((employee) => employee.department || 'Unassigned'))
    const totalAmount = reports.reduce((sum, record) => sum + Number(record.amount || 0), 0)

    return {
      employees: employees.length,
      departments: departments.size,
      reports: reports.length,
      totalAmount,
    }
  }, [getFinanceEmployees, getFinanceRecords])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 shadow-2xl shadow-black/20">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Finance Home
          </div>
          <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">Finance now has its own clean workspace</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Use the left sidebar to jump into the daily production view or the department employee list. This page is just the reset entry point.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Daily reports" value={stats.reports} hint="Submitted production reports" />
          <StatCard label="Employees" value={stats.employees} hint="Pulled from finance attendance" />
          <StatCard label="Departments" value={stats.departments} hint="Grouped in the employee page" />
          <StatCard label="Amount" value={`₱${stats.totalAmount.toLocaleString()}`} hint="Total value across finance records" />
        </div>

      </section>
    </div>
  )
}
