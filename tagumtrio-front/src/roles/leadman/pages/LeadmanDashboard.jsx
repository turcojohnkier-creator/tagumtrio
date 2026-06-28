import { useMemo } from 'react'
import { ScanLine } from 'lucide-react'
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

  const scanCandidates = useMemo(() => {
    return (Array.isArray(employees) ? employees : [])
      .filter((employee) => (employee.department || '').toLowerCase() === selectedDepartment.toLowerCase())
      .map((employee) => ({
        employeeId: employee.identifier,
        employeeName: employee.name,
        department: employee.department || selectedDepartment,
      }))
      .filter((employee) => employee.employeeId && employee.employeeName)
  }, [employees, selectedDepartment])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leadman reporting"
        title="Report Dashboard"
        description="Use this page to create reports for deployed workers. Deployed workers and the daily report live on separate pages."
        actions={(
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Department</p>
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