import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { fetchEmployeesApi } from '../../lib/api'
import { DEPARTMENTS } from '../../constants/departments'

export default function EmployeeDirectory() {
	const [employees, setEmployees] = useState([])
	const [searchText, setSearchText] = useState('')
	const [departmentFilter, setDepartmentFilter] = useState('All Departments')
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	useEffect(() => {
		let cancelled = false

		async function loadEmployees() {
			setLoading(true)
			setError('')
			try {
				const remoteEmployees = await fetchEmployeesApi()
				if (!cancelled) {
					setEmployees(Array.isArray(remoteEmployees) ? remoteEmployees : [])
				}
			} catch (err) {
				if (!cancelled) {
					setError(err?.message || 'Failed to load employees.')
					setEmployees([])
				}
			} finally {
				if (!cancelled) setLoading(false)
			}
		}

		loadEmployees()
		return () => {
			cancelled = true
		}
	}, [])

	const filteredEmployees = useMemo(() => {
		const query = searchText.trim().toLowerCase()

		return employees.filter((emp) => {
			const id = String(emp.employeeId || emp.id || emp.employee_id || '')
			const name = String(emp.employeeName || emp.name || emp.employee_name || '')
			const role = String(emp.role || '')
			const isEmployee = role.toLowerCase() === 'employee'
			const department = String(emp.department || emp.dept || emp.departmentName || '')

			const matchesQuery = !query || [id, name, role, department].some((field) => field.toLowerCase().includes(query))
			const matchesDepartment = departmentFilter === 'All Departments' || department === departmentFilter
			const matchesRole = isEmployee
			return matchesQuery && matchesDepartment && matchesRole
		})
	}, [employees, searchText, departmentFilter])

	const departmentOptions = useMemo(() => {
		return ['All Departments', ...DEPARTMENTS]
	}, [employees])

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

			{error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
			{loading && <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">Loading employees from the database...</div>}

			<div className="space-y-4">
				{filteredEmployees.map((emp) => {
					const id = emp.employeeId || emp.id || emp.employee_id || ''
					const name = emp.employeeName || emp.name || emp.employee_name || 'Unknown'
					const role = emp.role || '—'
					const dept = emp.department || emp.dept || emp.departmentName || '—'
					const status = emp.status || (emp.is_active === false ? 'Inactive' : 'Active')
					return (
						<div key={id || name} className="bg-slate-900 border border-slate-800 rounded-xl p-4 xl:p-5 hover:border-slate-700 transition-colors group cursor-pointer">
							<div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
								<div className="flex items-center gap-4 min-w-0 xl:flex-1">
									<div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-300 border border-slate-700 group-hover:border-emerald-500/50 transition-colors shrink-0">
										{name.split(' ').map((n) => n[0]).join('')}
									</div>
									<div className="min-w-0">
										<h3 className="font-semibold text-white truncate">{name}</h3>
										<p className="text-xs text-slate-400">{id}</p>
									</div>
								</div>

								<div className="grid gap-3 sm:grid-cols-2 xl:w-[40%] 2xl:w-[36%]">
									<div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 sm:col-span-2">
										<p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Department</p>
										<p className="mt-1 text-sm font-medium text-slate-200">{dept}</p>
									</div>
								</div>

								<div className="xl:min-w-[220px]" />
							</div>
						</div>
					)
				})}
			</div>

			{!loading && filteredEmployees.length === 0 && (
				<div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-sm text-slate-400">
					No employees matched your filters.
				</div>
			)}
		</div>
	)
}
