import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'

export default function LeadmanWorkers() {
  const { user } = useAuth()
  const { getLeadmanDeployedEmployees, getEmployeeAttendance, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useQr()

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
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Leadman roster</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Deployed Workers</h2>
            <p className="mt-1 text-sm text-slate-400">Review the workers deployed under the selected department.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-2 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search deployed workers..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-800 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><Users className="h-5 w-5 text-cyan-400" /> Active Workers</h3>
        </div>
        {deployedEmployees.length === 0 ? (
          <div className="p-6 text-sm text-slate-400">No deployed employees in {selectedDepartment} yet.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {deployedEmployees.map((employee) => {
              const employeeAttendance = getEmployeeAttendance(employee.employeeId).filter((record) => record.status === 'leadman_verified')
              return (
                <div key={employee.employeeId} className="flex flex-col gap-3 p-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{employee.employeeName}</p>
                    <p className="mt-1 text-sm text-slate-400">{employee.employeeId} • {employee.department}</p>
                    <p className="mt-1 text-xs text-slate-500">Approved {formatDateTime(employee.approvedAt)}</p>
                    <p className="mt-1 text-xs text-slate-500">Scans waiting for head verification: {employeeAttendance.length}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}