import { CalendarDays } from 'lucide-react'

export default function EmployeeCard({
  employee,
  onClick,
  className = '',
  statusLabel,
}) {
  const id = employee.employeeId || employee.id || employee.employee_id || ''
  const name = employee.employeeName || employee.name || employee.employee_name || 'Unknown'
  const role = employee.role || '—'
  const department = employee.department || employee.dept || employee.departmentName || '—'
  const status = statusLabel || employee.status || 'Active'
  const createdAt = employee.createdAt || employee.created_at || employee.registeredAt || employee.registered_at || employee.addedAt || employee.added_at || employee.insertedAt || employee.inserted_at
  const createdLabel = createdAt ? new Date(createdAt).toLocaleDateString() : '—'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-xl p-4 transition-colors ${onClick ? 'cursor-pointer hover:border-slate-700 group' : ''} ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-700 group-hover:border-emerald-500/50 transition-colors shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate leading-tight">{name}</h3>
            <p className="text-xs text-slate-400 truncate mt-0.5">{id}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}
          >
            {status}
          </span>
          {department && department !== '—' ? (
            <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs text-slate-300">
              {department}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`mt-3 grid gap-2 text-sm ${department && department !== '—' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Role</div>
          <div className="mt-1 truncate text-slate-200">{role}</div>
        </div>
        {department && department !== '—' ? (
          <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Department</div>
            <div className="mt-1 truncate text-slate-200">{department}</div>
          </div>
        ) : null}
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Created</div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-slate-200">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            <span>{createdLabel}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
