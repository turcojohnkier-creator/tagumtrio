import { CalendarDays } from 'lucide-react'
import { formatRole } from '../../../lib/roles'
import { formatEmployeeId } from '../../../lib/employeeId'

export default function EmployeeCard({
  employee,
  onClick,
  className = '',
  onToggleActive,
  actionLoading = false,
  statusLabel,
}) {
  const id = employee.employeeId || employee.id || employee.employee_id || ''
  const name = employee.employeeName || employee.name || employee.employee_name || 'Unknown'
  const role = employee.role ? formatRole(employee.role) : '—'
  const department = employee.department || employee.dept || employee.departmentName || '—'
  const status = statusLabel || employee.status || 'Active'
  const isActive = employee.is_active !== false
  const createdAt = employee.createdAt || employee.created_at || employee.registeredAt || employee.registered_at || employee.addedAt || employee.added_at || employee.insertedAt || employee.inserted_at
  const createdLabel = createdAt ? new Date(createdAt).toLocaleDateString() : '—'
  const toggleLabel = isActive ? 'Archive' : 'Reactivate'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((chunk) => chunk[0])
    .join('')
    .slice(0, 2)

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-zinc-200 rounded-xl p-4 transition-colors ${onClick ? 'cursor-pointer hover:border-zinc-300 group' : ''} ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-semibold text-zinc-700 border border-zinc-300 group-hover:border-emerald-500/50 transition-colors shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-900 truncate leading-tight">{name}</h3>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{formatEmployeeId(id)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status === 'Active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'}`}
          >
            {status}
          </span>
          {department && department !== '—' ? (
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
              {department}
            </span>
          ) : null}
        </div>
      </div>

      <div className={`mt-3 grid gap-2 text-sm ${department && department !== '—' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Role</div>
          <div className="mt-1 truncate text-zinc-800">{role}</div>
        </div>
        {department && department !== '—' ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-zinc-400">Department</div>
            <div className="mt-1 truncate text-zinc-800">{department}</div>
          </div>
        ) : null}
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Created</div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-zinc-800">
            <CalendarDays className="h-3.5 w-3.5 text-zinc-400" />
            <span>{createdLabel}</span>
          </div>
        </div>
      </div>

      {onToggleActive ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onToggleActive(employee)
            }}
            disabled={actionLoading}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${isActive ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15'}`}
          >
            {actionLoading ? 'Updating...' : toggleLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
