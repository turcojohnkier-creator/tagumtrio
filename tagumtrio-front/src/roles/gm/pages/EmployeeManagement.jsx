import { useMemo, useState } from 'react'
import { Search, Edit, Trash2 } from 'lucide-react'
import { useQr } from '../../../context/qr-context'
import { useAuth } from '../../../context/auth-context'
import { DEPARTMENTS } from '../../../constants/departments'

export default function EmployeeManagement() {
  const { t } = useAuth()
  const { employees = [] } = useQr()
  const [searchText, setSearchText] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return (Array.isArray(employees) ? employees : []).filter((e) => {
      const id = String(e.employeeId || e.id || e.employee_id || '')
      const name = String(e.employeeName || e.name || e.employee_name || '')
      const department = String(e.department || e.dept || e.departmentName || '')
      const matchesQ = !q || name.toLowerCase().includes(q) || id.toLowerCase().includes(q) || department.toLowerCase().includes(q)
      const matchesDept = departmentFilter === 'All Departments' || department === departmentFilter
      return matchesQ && matchesDept
    })
  }, [employees, searchText, departmentFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{t('gm.employee.title')}</h2>
          <p className="text-slate-500 mt-1">{t('gm.employee.desc')}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex flex-col xl:flex-row gap-4 xl:items-center">
        <div className="relative w-full xl:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t('gm.employee.search')}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg pl-10 pr-4 py-2.5"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg px-4 py-2.5"
        >
          <option value="All Departments">{t('gm.employee.all_depts')}</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              {t('gm.employee.no_match')}
            </div>
          ) : (
            filtered.map((emp) => {
              const id = emp.employeeId || emp.id || emp.employee_id || '—'
              const name = emp.employeeName || emp.name || emp.employee_name || 'Unknown'
              const department = emp.department || emp.dept || emp.departmentName || 'Unassigned'
              return (
                <div key={id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">{name}</div>
                    <div className="text-xs text-slate-500">{id} • {department}</div>
                  </div>
                  
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
