import { useEffect, useMemo, useState } from 'react'
import { Clock, Search, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import { setAttendanceApi } from '../../../lib/api'
import { formatEmployeeId } from '../../../lib/employeeId'
import useLiveRefresh from '../../../shared/hooks/useLiveRefresh'
import useAttendance, { formatSessionRange, formatSessionTime, isDemoSession } from '../../../shared/hooks/useAttendance'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'
import Avatar from '../../../shared/ui/Avatar'
import ProfileLink from '../../../shared/profile/ProfileLink'

function describeLockedState(status) {
  const opensAt = formatSessionTime(status?.nextSession?.start)
  if (status?.state === 'lunch') return { title: 'Lunch break', detail: `Attendance opens again at ${opensAt}.` }
  if (status?.state === 'ended') return { title: 'Work day ended', detail: `Attendance opens tomorrow at ${opensAt}.` }
  return { title: 'Not started yet', detail: `Morning attendance opens at ${opensAt}.` }
}

function AttendanceSwitch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-emerald-600' : 'bg-zinc-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function LeadmanWorkers() {
  const { user } = useAuth()
  const dialog = useDialog()
  const { employees, selectedLeadmanDepartment, setSelectedLeadmanDepartment, refreshEmployees, markNotificationsSeen } = useAppData()

  // HR creating an employee in one of this leadman's departments sends an
  // `employee_account_created` notification: reload the roster when it
  // arrives, and clear the nav red dot once the page is open.
  useEffect(() => {
    markNotificationsSeen?.('employee_account_created')
  }, [])
  useLiveRefresh(() => refreshEmployees?.(), {
    types: ['employee_account_created'],
    clearTypes: ['employee_account_created'],
    intervalMs: 60000,
  })

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''
  const [query, setQuery] = useState('')
  const [savingIds, setSavingIds] = useState(() => new Set())

  const { status, presentIds, isOpen, loading, error, refresh, replaceStatus } = useAttendance(selectedDepartment, {
    enabled: Boolean(selectedDepartment),
  })

  // Deployed = active employee accounts in this department (same rule the
  // backend and the GM overview use, so the counts match).
  const departmentEmployees = useMemo(() => {
    return (Array.isArray(employees) ? employees : [])
      .filter((employee) => (employee.department || '').toLowerCase() === selectedDepartment.toLowerCase())
      .filter((employee) => (employee.role || 'employee') === 'employee' && employee.is_active !== false)
      .map((employee) => ({
        userId: Number(employee.id ?? employee.employeeId),
        employeeId: String(employee.identifier ?? employee.employeeId ?? ''),
        employeeName: employee.name || employee.employeeName || '',
        department: employee.department || selectedDepartment,
        avatar_url: employee.avatar_url || null,
      }))
      .filter((employee) => Number.isFinite(employee.userId) && employee.employeeId && employee.employeeName)
  }, [employees, selectedDepartment])

  const deployedEmployees = useMemo(() => {
    const needle = query.toLowerCase()
    return departmentEmployees.filter((employee) => employee.employeeName.toLowerCase().includes(needle) || employee.employeeId.toLowerCase().includes(needle))
  }, [departmentEmployees, query])

  const activeCount = departmentEmployees.filter((employee) => presentIds.has(employee.userId)).length

  async function handleToggle(employee, present) {
    if (!status || !isOpen) return
    const previous = status
    const ids = new Set(presentIds)
    if (present) ids.add(employee.userId)
    else ids.delete(employee.userId)
    replaceStatus({ ...status, presentEmployeeIds: [...ids] })
    setSavingIds((current) => new Set(current).add(employee.userId))

    try {
      const next = await setAttendanceApi(employee.userId, present)
      if (next) replaceStatus(next)
    } catch (err) {
      replaceStatus(previous)
      dialog.error({
        title: 'Attendance not saved',
        message: err?.message || 'Unable to update attendance. Please try again.',
      })
      // A 409 means the session just ended — pull the new state.
      refresh()
    } finally {
      setSavingIds((current) => {
        const nextIds = new Set(current)
        nextIds.delete(employee.userId)
        return nextIds
      })
    }
  }

  const locked = status && !isOpen ? describeLockedState(status) : null

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow="Leadman roster"
        title="Deployed Workers"

        actions={(
          <div className="rounded-lg border border-white/20 bg-white/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-50/90">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-1.5 min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        )}
      >
        <div className="max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search deployed workers..." className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>
      </PageHeader>

      <div className={`flex flex-col gap-2 rounded-xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${isOpen ? 'border-emerald-200 bg-emerald-50/60' : 'border-zinc-200 bg-white'}`}>
        <div className="flex items-start gap-3">
          <Clock className={`mt-0.5 h-5 w-5 shrink-0 ${isOpen ? 'text-emerald-600' : 'text-zinc-400'}`} />
          <div>
            {isOpen ? (
              <>
                {isDemoSession(status.session) ? (
                  <>
                    <p className="font-semibold text-zinc-900">Demo mode · time in / time out is off</p>
                    <p className="text-sm text-zinc-600">The GM turned off the work-session times, so you can mark workers at any hour. Everyone resets to absent at midnight.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-zinc-900">{status.session.label} session · {formatSessionRange(status.session)}</p>
                    <p className="text-sm text-zinc-600">Switch on each worker who is present. Everyone resets to absent at {formatSessionTime(status.session.end)}.</p>
                  </>
                )}
              </>
            ) : locked ? (
              <>
                <p className="font-semibold text-zinc-900">{locked.title}</p>
                <p className="text-sm text-zinc-600">{locked.detail}</p>
              </>
            ) : error ? (
              <p className="text-sm text-rose-600">Couldn&apos;t load attendance. Retrying…</p>
            ) : (
              <p className="text-sm text-zinc-500">Loading attendance…</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <div className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm text-zinc-700 ring-1 ring-inset ring-emerald-200">
            <span className="text-lg font-bold text-emerald-700">{activeCount}</span> of {departmentEmployees.length} present
          </div>
        ) : null}
      </div>

      <Card padding="p-0">
        <div className="border-b border-zinc-200 px-6 py-4">
          <SectionTitle icon={Users}>Workers</SectionTitle>
        </div>
        {deployedEmployees.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No deployed workers" description={`No deployed employees in ${selectedDepartment} yet.`} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {deployedEmployees.map((employee, index) => {
                  const present = isOpen && presentIds.has(employee.userId)
                  return (
                    <tr key={employee.userId} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-zinc-900">{formatEmployeeId(employee.employeeId)}</td>
                      <td className="px-4 py-3 text-zinc-900">
                        <ProfileLink userId={employee.userId ?? employee.employeeId} name={employee.employeeName} className="flex items-center gap-2.5">
                          <Avatar name={employee.employeeName} src={employee.avatar_url} size="sm" />
                          <span>{employee.employeeName}</span>
                        </ProfileLink>
                      </td>
                      <td className="px-4 py-3">{employee.department || selectedDepartment}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AttendanceSwitch
                            checked={present}
                            disabled={!isOpen || loading || savingIds.has(employee.userId)}
                            onChange={(next) => handleToggle(employee, next)}
                            label={`Mark ${employee.employeeName} ${present ? 'absent' : 'present'}`}
                          />
                          {/* Fixed width: "Present" and "Absent" differ in length, which resized the column on every toggle. */}
                          <Badge variant={present ? 'success' : 'neutral'} className="w-[5.5rem] justify-center">{present ? 'Present' : 'Absent'}</Badge>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
