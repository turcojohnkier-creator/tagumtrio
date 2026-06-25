import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import EmployeeCard from '../../../roles/leadman/components/EmployeeCard'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import EmptyState from '../../../shared/ui/EmptyState'

export default function LeadmanWorkers() {
  const { user } = useAuth()
  const { getLeadmanDeployedEmployees, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useAppData()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''
  const [query, setQuery] = useState('')

  const deployedEmployees = useMemo(() => {
    return getLeadmanDeployedEmployees(selectedDepartment)
      .map((request) => ({
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        department: request.requestedDepartment,
        approvedAt: request.leadmanAt,
      }))
      .filter((employee) => employee.employeeName.toLowerCase().includes(query.toLowerCase()) || employee.employeeId.toLowerCase().includes(query.toLowerCase()))
  }, [getLeadmanDeployedEmployees, query, selectedDepartment])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leadman roster"
        title="Deployed Workers"
        description="Review the workers deployed under the selected department."
        actions={(
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-1.5 min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        )}
      >
        <div className="max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search deployed workers..." className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
      </PageHeader>

      <Card padding="p-0">
        <div className="border-b border-zinc-200 px-6 py-4">
          <SectionTitle icon={Users}>Active Workers</SectionTitle>
        </div>
        {deployedEmployees.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No deployed workers" description={`No deployed employees in ${selectedDepartment} yet.`} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-6">
            {deployedEmployees.map((employee) => {
              return (
                <EmployeeCard
                  key={employee.employeeId}
                  employee={{
                    employeeId: employee.employeeId,
                    employeeName: employee.employeeName,
                    department: employee.department,
                    role: employee.role || 'Worker',

                  }}
                  showActions={false}
                />
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}