import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import DepartmentCard from '../../../roles/gm/components/DepartmentCard'
import EmployeeListModal from '../../../roles/gm/components/EmployeeListModal'
import { DEPARTMENTS } from '../../../constants/departments'
import { useAppData } from '../../../context/app-data-context'
import { useAuth } from '../../../context/auth-context'
import { fetchEmployeesByDepartmentApi, fetchEmployeesApi } from '../../../lib/api'
import PageHeader from '../../../shared/ui/PageHeader'

export default function GMOverview() {
  const { t } = useAuth()
  const { employees = [], employeesLoading, updateEmployeeRecord } = useAppData()
  const [selectedDept, setSelectedDept] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [sortOption, setSortOption] = useState('most')

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.is_active !== false), [employees])

  // Prefer server-provided employees for accurate department counts
  const [serverEmployees, setServerEmployees] = useState([])
  const [serverLoading, setServerLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      setServerLoading(true)
      try {
        const list = await fetchEmployeesApi()
        if (!cancelled) setServerEmployees(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) setServerEmployees([])
      } finally {
        if (!cancelled) setServerLoading(false)
      }
    }
    loadAll()
    return () => { cancelled = true }
  }, [])

  const departments = useMemo(() => {
    const counts = {}
    const list = (serverEmployees && serverEmployees.length > 0) ? serverEmployees : activeEmployees
    list.forEach((employee) => {
      const department = employee.department || 'Unassigned'
      counts[department] = (counts[department] || 0) + 1
    })
    return DEPARTMENTS.map((name) => ({ name, activeCount: counts[name] || 0 }))
  }, [serverEmployees, activeEmployees])

  const sortedDepartments = useMemo(() => {
    return [...departments].sort((a, b) => {
      if (sortOption === 'most') {
        return b.activeCount - a.activeCount
      }
      return a.activeCount - b.activeCount
    })
  }, [departments, sortOption])

  function openDept(dept) {
    setSelectedDept(dept)
    setShowModal(true)
  }

  function handleEmployeeReassigned(notification) {
    // The backend creates the reassignment notifications (for the employee and
    // the target department's leadman) as a side effect of the PATCH already
    // made in EmployeeListModal — just keep the local roster in sync here.
    if (notification?.employeeId) {
      updateEmployeeRecord(notification.employeeId, { department: notification.targetDepartment })
    }
  }

  // load employees for selected department when modal opens
  const [deptEmployees, setDeptEmployees] = useState([])
  const [deptLoading, setDeptLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadDept() {
      if (!selectedDept) return
      setDeptLoading(true)
      try {
        const list = await fetchEmployeesByDepartmentApi(selectedDept.name)
        if (!cancelled) setDeptEmployees(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) setDeptEmployees([])
      } finally {
        if (!cancelled) setDeptLoading(false)
      }
    }
    loadDept()
    return () => { cancelled = true }
  }, [selectedDept])

  return (
    <div className="space-y-6 pb-8">
      <div className="space-y-5">
        <PageHeader
          tone="brand"
          eyebrow={`${departments.length} ${t('gm.overview.departments')}`}
          title={t('gm.overview.title')}
          description={t(' ')}
          actions={(
            <div className="inline-flex gap-1 rounded-full bg-white/15 p-1">
              <button
                type="button"
                onClick={() => setSortOption('most')}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${sortOption === 'most' ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                {t('gm.overview.most')}
              </button>
              <button
                type="button"
                onClick={() => setSortOption('least')}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${sortOption === 'least' ? 'bg-white text-emerald-700 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                {t('gm.overview.least')}
              </button>
            </div>
          )}
        />

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {employeesLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-xl bg-white" />
              ))
            : sortedDepartments.map((d) => (
                <motion.div key={d.name} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}>
                  <DepartmentCard department={d} onOpen={() => openDept(d)} />
                </motion.div>
              ))}
        </motion.div>
      </div>

      {showModal && selectedDept && (
        <EmployeeListModal
          department={selectedDept}
          onClose={() => setShowModal(false)}
          employees={deptEmployees.length > 0 ? deptEmployees : employees}
          loading={deptLoading}
          onReassigned={handleEmployeeReassigned}
        />
      )}
    </div>
  )
}
