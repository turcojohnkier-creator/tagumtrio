import { useMemo } from 'react'
import { ScanLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAttendance, { formatSessionTime } from '../../../shared/hooks/useAttendance'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import ReportEntryForm from '../../../roles/leadman/components/ReportEntryForm'
import { useDialog } from '../../../context/dialog-context'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'

export default function LeadmanDashboard() {
  const { user } = useAuth()
  const { employees, addReportEntry, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useAppData()
  const dialog = useDialog()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''

  const { status: attendance, presentIds, isOpen: attendanceOpen } = useAttendance(selectedDepartment, {
    enabled: Boolean(selectedDepartment),
  })

  // Only workers marked active for the current session can go into a report.
  // Outside a session (before 7 AM, lunch, after 6 PM) nobody is active, so
  // the list is empty and no report can be created.
  const scanCandidates = useMemo(() => {
    return (Array.isArray(employees) ? employees : [])
      .filter((employee) => (employee.department || '').toLowerCase() === selectedDepartment.toLowerCase())
      .filter((employee) => attendanceOpen && presentIds.has(Number(employee.id ?? employee.employeeId)))
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        department: employee.department || selectedDepartment,
        avatar_url: employee.avatar_url || null,
      }))
      .filter((employee) => employee.employeeId && employee.employeeName)
  }, [employees, selectedDepartment, attendanceOpen, presentIds])

  let attendanceNotice = null
  if (!attendance) {
    attendanceNotice = 'Loading attendance…'
  } else if (!attendanceOpen) {
    const opensAt = formatSessionTime(attendance.nextSession?.start)
    attendanceNotice = attendance.state === 'lunch'
      ? `Lunch break: no workers are active. Reports can be created again from ${opensAt}.`
      : attendance.state === 'ended'
        ? `The work day has ended: no workers are active. Reports can be created again tomorrow from ${opensAt}.`
        : `No session has started yet. Reports can be created from ${opensAt}.`
  } else if (scanCandidates.length === 0) {
    attendanceNotice = 'No workers are marked active for this session. Switch them on in Deployed Workers first.'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow="Leadman reporting"
        title="Report Dashboard"
        actions={(
          <div className="rounded-lg border border-white/20 bg-white/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-50/90">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-1.5 w-full min-w-[220px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        )}
      />

      <Card>
        <SectionTitle icon={ScanLine} hint="Select the deployed workers to include and fill in the department report details below.">
          Create Report
        </SectionTitle>

        {attendanceNotice ? (
          <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{attendanceNotice}</span>
            {attendanceOpen ? (
              <Link to="/app/leadman/workers" className="shrink-0 font-semibold text-amber-900 underline underline-offset-2">
                Go to Deployed Workers
              </Link>
            ) : null}
          </div>
        ) : null}

        <ReportEntryForm
          department={selectedDepartment}
          employeeOptions={scanCandidates}
          submitLabel="Create Report"
          onSubmit={(payloads) => {
            const list = Array.isArray(payloads) ? payloads : [payloads]
            if (list.length === 0) return
            list.forEach((payload) => addReportEntry(payload))
            dialog.success({
              title: 'Report recorded',
              message: 'The worker report was submitted successfully.',
            })
          }}
        />
      </Card>
    </div>
  )
}