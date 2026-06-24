import { useMemo, useState, useEffect } from 'react'
import { ArrowUpDown, Search, Users, X } from 'lucide-react'
import { useQr } from '../../../context/qr-context'
import { fetchEmployeesByDepartmentApi } from '../../../lib/api'

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDepartment(employee) {
  return employee?.department || 'Unassigned'
}

function recentOnly(records = []) {
  const cutoff = Date.now() - (15 * 24 * 60 * 60 * 1000)
  return (Array.isArray(records) ? records : [])
    .filter((record) => {
      const timestamp = new Date(record?.scannedAt || record?.createdAt || 0).getTime()
      return Number.isFinite(timestamp) && timestamp >= cutoff
    })
    .sort((a, b) => new Date(b.scannedAt || b.createdAt || 0) - new Date(a.scannedAt || a.createdAt || 0))
}

function EmployeeModal({ employee, history, onClose }) {
  const [confirmAction, setConfirmAction] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!employee) return null

  const totalAmount = history.reduce((sum, record) => sum + Number(record.amount || 0), 0)
  const totalHours = history.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0)

  function openConfirmation(action) {
    setConfirmAction(action)
    setConfirmOpen(true)
  }

  function closeConfirmation() {
    setConfirmOpen(false)
    setConfirmAction('')
  }

  function handleConfirm() {
    closeConfirmation()
  }

  const confirmationTitle = confirmAction === 'submit'
    ? 'Confirm submit'
    : confirmAction === 'pdf'
      ? 'Confirm PDF generation'
      : ''

  const confirmationMessage = confirmAction === 'submit'
    ? `Submit the salary summary for ${employee.employeeName} now?`
    : confirmAction === 'pdf'
      ? `Generate a PDF version of ${employee.employeeName}'s 15-day production summary?`
      : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">15-day production history</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{employee.employeeName}</h3>
            <p className="mt-1 text-sm text-slate-400">{employee.employeeId} • {getDepartment(employee)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Logs</p>
            <p className="mt-2 text-2xl font-bold text-white">{history.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Hours</p>
            <p className="mt-2 text-2xl font-bold text-white">{totalHours.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
            <p className="mt-2 text-2xl font-bold text-cyan-300">₱{totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="px-5 pb-4">
          <div className="max-h-[52vh] overflow-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No production history in the last 15 days.</td>
                  </tr>
                ) : (
                  history.map((record) => (
                    <tr key={record.id || `${record.employeeId}-${record.scannedAt}`} className="text-slate-300 hover:bg-slate-900/70">
                      <td className="px-4 py-4">{formatDate(record.scannedAt || record.createdAt)}</td>
                      <td className="px-4 py-4">{record.department || getDepartment(employee)}</td>
                      <td className="px-4 py-4">{Number(record.loggedHours || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 font-semibold text-cyan-300">₱{Number(record.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">Use the action buttons below to submit or export this payroll summary.</p>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => openConfirmation('pdf')}
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-cyan-500/50 hover:bg-slate-900"
            >
              Generate PDF
            </button>
            <button
              type="button"
              onClick={() => openConfirmation('submit')}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
            >
              Submit
            </button>
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:bg-slate-700">
              Close
            </button>
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{confirmationTitle || 'Confirm action'}</p>
              <h4 className="mt-2 text-xl font-semibold">{confirmationTitle}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-300">{confirmationMessage}</p>
              <p className="mt-2 text-xs text-slate-500">This is a placeholder confirmation modal for the finance employee summary action.</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirmation}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
              >
                Confirm {confirmAction === 'submit' ? 'Submit' : 'Generate PDF'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function FinanceDepartmentEmployees() {
  const { getFinanceEmployees, getFinanceEmployeeHistory } = useQr()
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')
  const [sortField, setSortField] = useState('name')
  const [sortDirection, setSortDirection] = useState('asc')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const employees = useMemo(() => {
    return getFinanceEmployees()
      .slice()
      .sort((a, b) => {
        const departmentCompare = getDepartment(a).localeCompare(getDepartment(b))
        if (departmentCompare !== 0) return departmentCompare
        return String(a.employeeName || '').localeCompare(String(b.employeeName || ''))
      })
  }, [getFinanceEmployees])

  // server-sourced employees for selected department (prefer backend when available)
  const [serverEmployees, setServerEmployees] = useState([])
  const [serverLoading, setServerLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!departmentFilter || departmentFilter === 'All Departments') {
        setServerEmployees([])
        return
      }
      setServerLoading(true)
      try {
        const list = await fetchEmployeesByDepartmentApi(departmentFilter)
        if (!cancelled) setServerEmployees(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) setServerEmployees([])
      } finally {
        if (!cancelled) setServerLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [departmentFilter])

  const departments = useMemo(() => {
    return ['All Departments', ...Array.from(new Set(employees.map((employee) => getDepartment(employee)).filter(Boolean))).sort()]
  }, [employees])

  const filteredEmployees = useMemo(() => {
    const search = query.trim().toLowerCase()
    const list = employees.filter((employee) => {
      const matchesSearch = !search
        || String(employee.employeeName || '').toLowerCase().includes(search)
        || String(employee.employeeId || '').toLowerCase().includes(search)
        || String(getDepartment(employee)).toLowerCase().includes(search)

      const matchesDepartment = departmentFilter === 'All Departments' || getDepartment(employee) === departmentFilter
      return matchesSearch && matchesDepartment
    })

    return list.sort((a, b) => {
      let comparison = 0
      if (sortField === 'department') {
        comparison = getDepartment(a).localeCompare(getDepartment(b))
      } else if (sortField === 'id') {
        comparison = String(a.employeeId || '').localeCompare(String(b.employeeId || ''))
      } else {
        comparison = String(a.employeeName || '').localeCompare(String(b.employeeName || ''))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [departmentFilter, employees, query, sortDirection, sortField])

  const selectedEmployee = useMemo(
    () => employees.find((employee) => String(employee.employeeId) === String(selectedEmployeeId)) || null,
    [employees, selectedEmployeeId]
  )

  const selectedHistory = useMemo(() => {
    if (!selectedEmployee) return []
    return recentOnly(getFinanceEmployeeHistory(selectedEmployee.employeeId))
  }, [getFinanceEmployeeHistory, selectedEmployee])

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <Users className="h-3.5 w-3.5" />
              Department Employees
            </div>
            <h1 className="text-3xl font-bold text-white">Employee list</h1>
            <p className="text-sm leading-6 text-slate-400">
              Sort and filter employees, then open a card to see the 15-day production history.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.5fr_0.5fr]">
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Search employees</label>
            <div className="mt-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, or department" className="w-full bg-transparent text-sm text-white focus:outline-none" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Department</label>
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="mt-1 w-full bg-slate-950 text-sm text-white focus:outline-none">
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
            <label className="text-[11px] uppercase tracking-wider text-slate-500">Sort by</label>
            <select value={sortField} onChange={(event) => setSortField(event.target.value)} className="mt-1 w-full bg-slate-950 text-sm text-white focus:outline-none">
              <option value="name">Name</option>
              <option value="id">Employee ID</option>
              <option value="department">Department</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-700"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Employees</h2>
            <p className="text-sm text-slate-400">No logs, hours, or amount are shown here. Open a card to inspect the production history.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{filteredEmployees.length} result{filteredEmployees.length === 1 ? '' : 's'}</p>
        </div>

          <div className="mt-5 space-y-3">
          {((serverEmployees && serverEmployees.length > 0) || filteredEmployees.length > 0) ? (
            (serverEmployees && serverEmployees.length > 0 ? serverEmployees : filteredEmployees).map((employee) => (
              <button
                key={employee.employeeId || employee.id}
                type="button"
                onClick={() => setSelectedEmployeeId(String(employee.employeeId || employee.id))}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition-colors hover:border-cyan-500/30 hover:bg-cyan-500/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{employee.employeeName || employee.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{employee.employeeId || employee.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-200">{getDepartment(employee)}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open</p>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">No employees match your search.</div>
          )}
        </div>
      </section>

      <EmployeeModal
        employee={selectedEmployee}
        history={selectedHistory}
        onClose={() => setSelectedEmployeeId('')}
      />
    </div>
  )
}
