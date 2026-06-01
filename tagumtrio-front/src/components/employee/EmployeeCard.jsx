import { Mail, Phone } from 'lucide-react'

export default function EmployeeCard({
  employee,
  onClick,
  className = '',
  showActions = true,
  statusLabel,
}) {
  const id = employee.employeeId || employee.id || employee.employee_id || ''
  const name = employee.employeeName || employee.name || employee.employee_name || 'Unknown'
  const role = employee.role || '—'
  const department = employee.department || employee.dept || employee.departmentName || '—'
  const status = statusLabel || employee.status || 'Active'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-xl p-6 transition-colors ${onClick ? 'cursor-pointer hover:border-slate-700 group' : ''} ${className}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-300 border border-slate-700 group-hover:border-emerald-500/50 transition-colors shrink-0">
            {initials}
          </div>
          <div>
            <h3 className="font-semibold text-white truncate">{name}</h3>
            <p className="text-xs text-slate-400 truncate">{id}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}
        >
          {status}
        </span>
      </div>

      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-16">Role:</span>
          <span className="text-slate-300 font-medium truncate">{role}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500 w-16">Dept:</span>
          <span className="text-slate-300 font-medium truncate">{department}</span>
        </div>
      </div>

      {showActions ? (
        <div className="mt-6 pt-4 border-t border-slate-800 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 py-2 rounded-lg text-sm transition-colors border border-slate-800">
            <Mail className="w-4 h-4" /> Message
          </button>
          <button className="flex items-center justify-center text-slate-400 hover:text-white bg-slate-950 hover:bg-slate-800 p-2 rounded-lg transition-colors border border-slate-800">
            <Phone className="w-4 h-4" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
