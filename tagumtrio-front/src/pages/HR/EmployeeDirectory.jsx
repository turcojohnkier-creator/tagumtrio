import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useQr } from '../../context/qr-context'
import { updateEmployeeApi } from '../../lib/api'
import EmployeeCard from '../../roles/hr/components/EmployeeCard'
import EmployeeDetailModal from '../../roles/hr/components/EmployeeDetailModal'

export default function EmployeeDirectory() {
  const { employees = [], employeesLoading, refreshEmployees } = useQr()
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [sortByRole, setSortByRole] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [localEmployees, setLocalEmployees] = useState([])
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const list = Array.isArray(employees) ? employees : []
    const excluded = new Set(['hr', 'gm', 'admin'])
    setLocalEmployees(list.filter((emp) => {
      const role = String(emp.role || '').toLowerCase()
      return !excluded.has(role)
    }))
  }, [employees])

  const roleOptions = useMemo(() => {
    const roles = new Set()
    ;(localEmployees || []).forEach((emp) => {
      if (emp.role) roles.add(emp.role)
    })
    return ['All Roles', ...Array.from(roles).sort()]
  }, [localEmployees])

  const handleToggleActive = async (employee) => {
    const id = employee.employeeId || employee.id || employee.employee_id
    if (id === undefined || id === null) return

    setActionLoading(true)
    try {
      const updated = await updateEmployeeApi(id, { is_active: !employee.is_active })
      setLocalEmployees((current) => current.map((emp) => (
        String(emp.employeeId || emp.id || emp.employee_id) === String(id) ? { ...emp, ...updated } : emp
      )))
      setSelectedEmployee((current) => (
        current && String(current.employeeId || current.id || current.employee_id) === String(id)
          ? { ...current, ...updated }
          : current
      ))
    } catch (error) {
      console.error('Failed to update account status', error)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredEmployees = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    const base = Array.isArray(localEmployees) ? localEmployees : []

    return base.filter((emp) => {
      const id = String(emp.employeeId || emp.id || emp.employee_id || '')
      const name = String(emp.employeeName || emp.name || emp.employee_name || '')
      const role = String(emp.role || '')

      const matchesQuery = !query || [id, name, role].some((field) => field.toLowerCase().includes(query))
      const matchesRole = roleFilter === 'All Roles' || role === roleFilter
      return matchesQuery && matchesRole
    }).sort((a, b) => {
      if (!sortByRole) return 0
      const roleA = String(a.role || '').toLowerCase()
      const roleB = String(b.role || '').toLowerCase()
      if (roleA < roleB) return -1
      if (roleA > roleB) return 1
      return 0
    })
  }, [localEmployees, searchText, roleFilter, sortByRole])

  const activeEmployees = useMemo(
    () => filteredEmployees.filter((employee) => employee.is_active !== false),
    [filteredEmployees]
  )

  const inactiveEmployees = useMemo(
    () => filteredEmployees.filter((employee) => employee.is_active === false),
    [filteredEmployees]
  )

  function renderEmployeeSection(title, employeesList, emptyMessage) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            {title}
          </h3>
          <span className="rounded-full border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-400">
            {employeesList.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {employeesList.map((emp) => {
            const id = emp.employeeId || emp.id || emp.employee_id || emp.employeeName || emp.name || emp.employee_name || String(emp)
            const statusLabel = emp.is_active === false ? 'Inactive' : 'Active'
            return (
              <EmployeeCard
                key={id}
                employee={emp}
                onClick={() => setSelectedEmployee(emp)}
                statusLabel={statusLabel}
                onToggleActive={handleToggleActive}
                actionLoading={actionLoading}
              />
            )
          })}
        </div>

        {employeesList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900 px-4 py-5 text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : null}
      </section>
    )
  }

  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">HR Accounts</h2>
          <p className="text-slate-400 mt-1">View all created accounts, inspect details, and archive or restore inactive users.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 grid gap-4 xl:grid-cols-[1.9fr_1fr] xl:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search accounts by name, ID, or role..."
            className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortByRole((current) => !current)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${sortByRole ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'}`}
          >
            {sortByRole ? 'Sorted by role' : 'Sort by role'}
          </button>
        </div>
      </div>

      {employeesLoading && <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">Loading accounts from the database...</div>}

      <div className="space-y-6">
        {renderEmployeeSection('Active Accounts', activeEmployees, 'No active accounts match your filters.')}
        {renderEmployeeSection('Inactive Accounts', inactiveEmployees, 'No inactive accounts match your filters.')}
      </div>

      {!employeesLoading && filteredEmployees.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">
          <div>No accounts matched your filters.</div>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => refreshEmployees().catch(() => {})}
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black"
            >
              Retry loading accounts
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('All Roles')}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          onToggleActive={handleToggleActive}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}
