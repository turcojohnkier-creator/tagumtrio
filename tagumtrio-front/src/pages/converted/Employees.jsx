import { useState } from 'react'
import { Search } from 'lucide-react'
import { useQr } from '../../context/qr-context'
import EmployeeCard from '../../components/employee/EmployeeCard'
import EmployeeDetailModal from '../../components/employee/EmployeeDetailModal'

export default function Employees() {
  const { employees = [] } = useQr()
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const visibleEmployees = (employees || []).filter(emp => String(emp.role || '').toLowerCase() === 'employee')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Employee Directory</h2>
          <p className="text-slate-400 mt-1">Manage personnel, departments, and roles.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input type="text" placeholder="Search employees by name, ID, or role..." className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <select className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 flex-1 sm:flex-none">
            <option>All Departments</option>
            <option>Production</option>
            <option>Human Resources</option>
            <option>Finance</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(visibleEmployees.length > 0 ? visibleEmployees : []).map((emp) => {
          const id = emp.employeeId || emp.id || emp.employee_id || String(emp).slice(0, 8)
          return (
            <EmployeeCard
              key={id}
              employee={emp}
              onClick={() => setSelectedEmployee(emp)}
            />
          )
        })}
      </div>

      {selectedEmployee && (
        <EmployeeDetailModal employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} />
      )}
    </div>
  )
}