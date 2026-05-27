import { Search, Mail, Phone } from 'lucide-react'
import { useQr } from '../../context/qr-context'

export default function Employees() {
  const { employees = [] } = useQr()
  const visibleEmployees = (employees || []).filter(emp => String(emp.role || '').toLowerCase() === 'employee')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Employee Directory</h2>
          <p className="text-slate-400 mt-1">Manage personnel, departments, and roles.</p>
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
          const name = emp.employeeName || emp.name || emp.employee_name || 'Unknown'
          const role = emp.role || '—'
          const dept = emp.department || emp.dept || emp.departmentName || '—'
          const status = emp.status || 'Active'
          return (
            <div key={id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors group cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-300 border border-slate-700 group-hover:border-emerald-500/50 transition-colors">
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{name}</h3>
                    <p className="text-xs text-slate-400">{id}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {status}
                </span>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 w-16">Role:</span>
                  <span className="text-slate-300 font-medium">{role}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 w-16">Dept:</span>
                  <span className="text-slate-300 font-medium">{dept}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 py-2 rounded-lg text-sm transition-colors border border-slate-800"><Mail className="w-4 h-4" /> Message</button>
                <button className="flex items-center justify-center text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 p-2 rounded-lg transition-colors border border-slate-800"><Phone className="w-4 h-4" /></button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
