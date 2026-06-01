import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useQr } from '../../context/qr-context'
import { DEPARTMENTS } from '../../constants/departments'
import EmployeeCard from '../../components/employee/EmployeeCard'
import EmployeeDetailModal from '../../components/employee/EmployeeDetailModal'

export default function EmployeeDirectory() {
  const { employees = [], employeesLoading } = useQr()
  const [searchText, setSearchText] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const filteredEmployees = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return (Array.isArray(employees) ? employees : []).filter((emp) => {
      const id = String(emp.employeeId || emp.id || emp.employee_id || '')
      const name = String(emp.employeeName || emp.name || emp.employee_name || '')
      const role = String(emp.role || '')
      const department = String(emp.department || emp.dept || emp.departmentName || '')

      const matchesQuery = !query || [id, name, role, department].some((field) => field.toLowerCase().includes(query))
      const matchesDepartment = departmentFilter === 'All Departments' || department === departmentFilter
      return matchesQuery && matchesDepartment
    })
  }, [employees, searchText, departmentFilter])

  const departmentOptions = useMemo(() => ['All Departments', ...DEPARTMENTS], [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Employee Directory</h2>
          <p className="text-slate-400 mt-1">Manage personnel, departments, and roles.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 flex flex-col xl:flex-row gap-4 xl:items-center">
        <div className="relative w-full xl:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search employees by name, ID, or department..."
            className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div className="flex gap-3 w-full xl:w-auto">
          <select
            value={departmentFilter}
            onChange={(event) => setDepartmentFilter(event.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex-1 xl:flex-none xl:min-w-56"
          >
            {departmentOptions.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        </div>
      </div>

      {employeesLoading && <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">Loading employees from the database...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredEmployees.map((emp) => {
          const id = emp.employeeId || emp.id || emp.employee_id || emp.employeeName || emp.name || emp.employee_name || String(emp)
          return (
            <EmployeeCard
              key={id}
              employee={emp}
              onClick={() => setSelectedEmployee(emp)}
            />
          )
        })}
      </div>

      {!employeesLoading && filteredEmployees.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">
          No employees matched your filters.
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  )
}
