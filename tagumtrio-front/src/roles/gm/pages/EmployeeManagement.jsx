import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useAppData } from '../../../context/app-data-context'
import { useAuth } from '../../../context/auth-context'
import { DEPARTMENTS } from '../../../constants/departments'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'

export default function EmployeeManagement() {
  const { t } = useAuth()
  const { employees = [] } = useAppData()
  const [searchText, setSearchText] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All Departments')

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return (Array.isArray(employees) ? employees : []).filter((e) => {
      const role = String(e.role || '').toLowerCase()
      if (role !== 'employee') return false
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
      <PageHeader tone="brand" title={t('gm.employee.title')} description={t('gm.employee.desc')} />

      <Card className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="relative w-full xl:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t('gm.employee.search')}
            className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-lg pl-10 pr-4 py-2.5"
          />
        </div>

        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 text-zinc-700 text-sm rounded-lg px-4 py-2.5"
        >
          <option value="All Departments">{t('gm.employee.all_depts')}</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title={t('gm.employee.no_match')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-emerald-50/70 text-emerald-800">
              <tr>
                <th className="px-4 py-3 font-medium">{t('gm.employee.col_id')}</th>
                <th className="px-4 py-3 font-medium">{t('gm.employee.col_name')}</th>
                <th className="px-4 py-3 font-medium">{t('gm.employee.col_department')}</th>
                <th className="px-4 py-3 font-medium">{t('gm.employee.col_status')}</th>
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-zinc-100"
              initial="hidden" animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            >
              {filtered.map((emp, index) => {
                const id = emp.employeeId || emp.id || emp.employee_id || '—'
                const name = emp.employeeName || emp.name || emp.employee_name || t('gm.modal.unknown')
                const department = emp.department || emp.dept || emp.departmentName || t('gm.modal.unassigned')
                const isActive = emp.is_active !== false
                return (
                  <motion.tr key={id} variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } } }} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
                    <td className="px-4 py-3 font-medium text-zinc-900">{id}</td>
                    <td className="px-4 py-3 text-zinc-900">{name}</td>
                    <td className="px-4 py-3">{department}</td>
                    <td className="px-4 py-3">
                      <Badge variant={isActive ? 'success' : 'neutral'}>{isActive ? t('gm.employee.active') : t('gm.employee.inactive')}</Badge>
                    </td>
                  </motion.tr>
                )
              })}
            </motion.tbody>
          </table>
        </div>
      )}
    </div>
  )
}
