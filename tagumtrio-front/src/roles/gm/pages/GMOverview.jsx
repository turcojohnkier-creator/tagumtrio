import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import DepartmentCard from '../../../roles/gm/components/DepartmentCard'
import EmployeeListModal from '../../../roles/gm/components/EmployeeListModal'
import { DEPARTMENTS } from '../../../constants/departments'
import { useAppData } from '../../../context/app-data-context'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { fetchEmployeesByDepartmentApi, fetchEmployeesApi, setAttendanceScheduleApi } from '../../../lib/api'
import useAttendance, { describeAttendance } from '../../../shared/hooks/useAttendance'
import PageHeader from '../../../shared/ui/PageHeader'

// Same rule as the leadman's Deployed Workers page and the backend, so the
// numbers match: active accounts with the plain employee role.
function isDeployedEmployee(employee) {
  return (employee.role || 'employee') === 'employee' && employee.is_active !== false
}

export default function GMOverview() {
  const { t, user } = useAuth()
  const dialog = useDialog()
  const { status: attendance, presentIds, isOpen: attendanceOpen, error: attendanceError, replaceStatus } = useAttendance()
  const isGm = user?.role === 'gm'
  const scheduleEnabled = attendance?.scheduleEnabled !== false
  const [savingSchedule, setSavingSchedule] = useState(false)

  async function toggleSchedule() {
    const next = !scheduleEnabled
    const confirmed = await dialog.confirm({
      title: next ? t('gm.attendance.turn_on_title', 'Turn time in / time out on?') : t('gm.attendance.turn_off_title', 'Turn time in / time out off?'),
      message: next
        ? t('gm.attendance.turn_on_msg', 'Attendance follows the work sessions again (7:00–11:30 AM, 1:00–4:00 PM, 4:00–6:00 PM) for everyone.')
        : t('gm.attendance.turn_off_msg', 'Leadmen can mark workers active at any hour, and marks only reset at midnight. This applies to everyone until you turn it back on.'),
      confirmText: next ? t('gm.attendance.on', 'On') : t('gm.attendance.off', 'Off'),
      cancelText: t('gm.consolidated.confirm_cancel', 'Cancel'),
    })
    if (!confirmed) return
    setSavingSchedule(true)
    try {
      replaceStatus(await setAttendanceScheduleApi(next))
    } catch (error) {
      dialog.error({ title: t('gm.attendance.schedule_failed', 'Could not change the setting'), message: error?.message || '' })
    } finally {
      setSavingSchedule(false)
    }
  }
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
    const employeeCounts = {}
    const activeCounts = {}
    const list = (serverEmployees && serverEmployees.length > 0) ? serverEmployees : activeEmployees
    list.filter(isDeployedEmployee).forEach((employee) => {
      const department = employee.department || 'Unassigned'
      employeeCounts[department] = (employeeCounts[department] || 0) + 1
      if (presentIds.has(Number(employee.id ?? employee.employeeId))) {
        activeCounts[department] = (activeCounts[department] || 0) + 1
      }
    })
    return DEPARTMENTS.map((name) => ({
      name,
      employeeCount: employeeCounts[name] || 0,
      activeCount: activeCounts[name] || 0,
    }))
  }, [serverEmployees, activeEmployees, presentIds])

  // Sorted by who is actually present, so understaffed departments surface;
  // ties (and every card outside work sessions) fall back to headcount.
  const sortedDepartments = useMemo(() => {
    const direction = sortOption === 'most' ? -1 : 1
    return [...departments].sort((a, b) => (
      direction * (a.activeCount - b.activeCount) || direction * (a.employeeCount - b.employeeCount)
    ))
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
      // The cards count from serverEmployees, so move the worker there too —
      // their attendance mark follows them, keeping Active counts right.
      setServerEmployees((current) => current.map((employee) => (
        String(employee.id) === String(notification.employeeId)
          ? { ...employee, department: notification.targetDepartment }
          : employee
      )))
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
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white">
              <Clock className="h-4 w-4" />
              {describeAttendance(attendance, attendanceError, t)}
            </p>
            {isGm && attendance ? (
              // Demo switch: off = attendance open all day, ignoring time in / time out.
              <button
                type="button"
                role="switch"
                aria-checked={scheduleEnabled}
                disabled={savingSchedule}
                onClick={toggleSchedule}
                title={t('gm.attendance.schedule_hint', 'Turn off to demo attendance at any hour. Applies to everyone.')}
                className="inline-flex items-center gap-2 rounded-full bg-white/15 py-1.5 pl-3 pr-1.5 text-sm font-medium text-white transition-colors hover:bg-white/25 disabled:cursor-wait disabled:opacity-60"
              >
                {t('gm.attendance.schedule_label', 'Time in / time out')}
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${scheduleEnabled ? 'bg-emerald-300' : 'bg-white/30'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${scheduleEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </span>
                <span className="w-7 text-left text-xs font-semibold uppercase">{scheduleEnabled ? t('gm.attendance.on', 'On') : t('gm.attendance.off', 'Off')}</span>
              </button>
            ) : null}
          </div>
        </PageHeader>

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
                  <DepartmentCard department={d} attendanceOpen={attendanceOpen} onOpen={() => openDept(d)} />
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
          presentIds={presentIds}
          attendanceOpen={attendanceOpen}
          onReassigned={handleEmployeeReassigned}
        />
      )}
    </div>
  )
}
