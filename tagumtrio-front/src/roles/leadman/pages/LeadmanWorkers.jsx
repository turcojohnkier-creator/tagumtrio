import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { formatEmployeeId } from '../../../lib/employeeId'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'

export default function LeadmanWorkers() {
  const { user } = useAuth()
  const { employees, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useAppData()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''
  const [query, setQuery] = useState('')

  const deployedEmployees = useMemo(() => {
    return (Array.isArray(employees) ? employees : [])
      .filter((employee) => (employee.department || '').toLowerCase() === selectedDepartment.toLowerCase())
      .map((employee) => ({
        employeeId: String(employee.identifier ?? employee.employeeId ?? ''),
        employeeName: employee.name || employee.employeeName || '',
        department: employee.department || selectedDepartment,
      }))
      .filter((employee) => employee.employeeId && employee.employeeName)
      .filter((employee) => employee.employeeName.toLowerCase().includes(query.toLowerCase()) || employee.employeeId.toLowerCase().includes(query.toLowerCase()))
  }, [employees, query, selectedDepartment])

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow="Leadman roster"
        title="Deployed Workers"
        
        actions={(
          <div className="rounded-lg border border-white/20 bg-white/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-50/90">Department</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {deployedEmployees.map((employee, index) => (
                  <tr key={employee.employeeId} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
                    <td className="px-4 py-3 font-medium text-zinc-900">{formatEmployeeId(employee.employeeId)}</td>
                    <td className="px-4 py-3 text-zinc-900">{employee.employeeName}</td>
                    <td className="px-4 py-3">{employee.department || selectedDepartment}</td>
                    <td className="px-4 py-3">
                      <Badge variant="success">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}