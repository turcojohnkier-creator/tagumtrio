import { LayoutDashboard } from 'lucide-react'
import { useMemo } from 'react'
import { useAppData } from '../../../context/app-data-context'
import PageHeader from '../../../shared/ui/PageHeader'
import StatCard from '../../../shared/ui/StatCard'

export default function FinanceHome() {
  const { getFinanceEmployees, getFinanceRecords } = useAppData()

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
      <PageHeader
        eyebrow={(
          <span className="inline-flex items-center gap-1.5">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Finance Home
          </span>
        )}
        title="Finance now has its own clean workspace"
        description="Use the navigation above to jump into the daily production view or the department employee list. This page is just the reset entry point."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Daily reports" value={stats.reports} hint="Submitted production reports" />
          <StatCard label="Employees" value={stats.employees} hint="Pulled from finance attendance" />
          <StatCard label="Departments" value={stats.departments} hint="Grouped in the employee page" />
          <StatCard label="Amount" value={`₱${stats.totalAmount.toLocaleString()}`} hint="Total value across finance records" highlight />
        </div>
      </PageHeader>
    </div>
  )
}
