import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useAppData } from '../../../context/app-data-context'
import { updateEmployeeApi } from '../../../lib/api'
import { formatRole } from '../../../lib/roles'
import { formatEmployeeId } from '../../../lib/employeeId'
import EmployeeDetailModal from '../../../roles/hr/components/EmployeeDetailModal'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'

// Kept in sync with ARCHIVE_RETENTION_DAYS in tagumtrio-back's
// app/api/v1/endpoints/users.py — the backend is the source of truth for the
// actual purge, this is only used to show a "days left" countdown here.
const ARCHIVE_RETENTION_DAYS = 90

function daysUntilPurge(archivedAt) {
  if (!archivedAt) return null
  const archivedDate = new Date(archivedAt)
  if (Number.isNaN(archivedDate.getTime())) return null
  const elapsedDays = Math.floor((Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, ARCHIVE_RETENTION_DAYS - elapsedDays)
}

export default function EmployeeDirectory() {
  const { employees = [], employeesLoading, refreshEmployees } = useAppData()
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [sortByRole, setSortByRole] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [localEmployees, setLocalEmployees] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [accountTab, setAccountTab] = useState('active')

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

      const matchesQuery = !query || [id, formatEmployeeId(id), name, role].some((field) => field.toLowerCase().includes(query))
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

  function renderEmployeeSection(employeesList, emptyMessage, { showRetention = false } = {}) {
    return (
      <section>
        {employeesList.length === 0 ? (
          <EmptyState description={emptyMessage} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {showRetention ? <th className="px-4 py-3 font-medium">Permanently deleted in</th> : null}
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody
                className="divide-y divide-zinc-100"
                initial="hidden" animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              >
                {employeesList.map((emp, index) => {
                  const id = emp.employeeId || emp.id || emp.employee_id || '—'
                  const name = emp.employeeName || emp.name || emp.employee_name || 'Unknown'
                  const department = emp.department || emp.dept || emp.departmentName || 'Unassigned'
                  const isActive = emp.is_active !== false
                  const daysLeft = showRetention ? daysUntilPurge(emp.archived_at || emp.archivedAt) : null
                  return (
                    <motion.tr key={id} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } } }} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{formatEmployeeId(id)}</td>
                      <td className="px-4 py-3 text-zinc-900">{name}</td>
                      <td className="px-4 py-3">{formatRole(emp.role)}</td>
                      <td className="px-4 py-3">{department}</td>
                      <td className="px-4 py-3">
                        <Badge variant={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      {showRetention ? (
                        <td className="px-4 py-3">
                          {daysLeft === null ? (
                            <span className="text-zinc-400">—</span>
                          ) : (
                            <Badge variant={daysLeft <= 7 ? 'danger' : daysLeft <= 30 ? 'warning' : 'neutral'}>
                              {daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                            </Badge>
                          )}
                        </td>
                      ) : null}
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedEmployee(emp)}>
                            View
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleToggleActive(emp)}
                          >
                            {isActive ? 'Archive' : 'Reactivate'}
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        title="HR Accounts"
        description="View all created accounts, inspect details, and archive or restore inactive users."
        actions={(
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-emerald-700">
            {localEmployees.length} accounts
          </span>
        )}
      />

      <Card className="grid gap-4 xl:grid-cols-[1.9fr_1fr] xl:items-center">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search accounts by name, ID, or role..."
            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>{role === 'All Roles' ? role : formatRole(role)}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSortByRole((current) => !current)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${sortByRole ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700' : 'border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'}`}
          >
            {sortByRole ? 'Sorted by role' : 'Sort by role'}
          </button>
        </div>
      </Card>

      {employeesLoading && <div className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500">Loading accounts from the database...</div>}

      <div className="space-y-4">
        <div className="flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50/60 w-fit">
          {[
            { key: 'active', label: 'Active', count: activeEmployees.length },
            { key: 'archived', label: 'Archived', count: inactiveEmployees.length },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setAccountTab(tab.key)}
              className={`px-4 py-2 text-sm font-semibold transition-colors ${accountTab === tab.key ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-white/60'}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {accountTab === 'archived' ? (
          <p className="text-sm text-zinc-500">
            Archived accounts are kept for {ARCHIVE_RETENTION_DAYS} days, then permanently deleted. Reactivate an account any time before then to keep it.
          </p>
        ) : null}

        {accountTab === 'active'
          ? renderEmployeeSection(activeEmployees, 'No active accounts match your filters.')
          : renderEmployeeSection(inactiveEmployees, 'No archived accounts match your filters.', { showRetention: true })}
      </div>

      {!employeesLoading && filteredEmployees.length === 0 && (
        <EmptyState
          title="No accounts matched your filters"
          action={(
            <div className="flex gap-3">
              <Button size="sm" onClick={() => refreshEmployees().catch(() => {})}>
                Retry loading accounts
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRoleFilter('All Roles')}>
                Clear filters
              </Button>
            </div>
          )}
        />
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
