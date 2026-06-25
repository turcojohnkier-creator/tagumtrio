import { useMemo, useState, useEffect } from 'react'
import { ScanLine, Search } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import ReportEntryModal from '../../../roles/leadman/components/ReportEntryModal'
import { useDialog } from '../../../context/dialog-context'
import EmployeeCard from '../../../roles/leadman/components/EmployeeCard'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

function asText(value) {
  return String(value || '').toLowerCase()
}

export default function LeadmanDashboard() {
  const { user } = useAuth()
  const { departmentRequests, employees, getLeadmanDeployedEmployees, addReportEntry, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useAppData()
  const dialog = useDialog()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const [query, setQuery] = useState('')
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''

  const deployedEmployees = useMemo(() => {
    return getLeadmanDeployedEmployees(selectedDepartment)
      .map((request) => ({
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        department: request.requestedDepartment,
        approvedAt: request.leadmanAt,
      }))
      .filter((employee) => employee.employeeId && employee.employeeName)
      .filter((employee) => asText(employee.employeeName).includes(asText(query)) || asText(employee.employeeId).includes(asText(query)))
  }, [getLeadmanDeployedEmployees, query, selectedDepartment])

  const fallbackDepartmentEmployees = useMemo(() => {
    return (Array.isArray(employees) ? employees : [])
      .filter((employee) => (employee.department || '').toLowerCase() === selectedDepartment.toLowerCase())
      .map((employee) => ({
        employeeId: employee.identifier,
        employeeName: employee.name,
        department: employee.department || selectedDepartment,
        approvedAt: null,
      }))
      .filter((employee) => employee.employeeId && employee.employeeName)
      .filter((employee) => asText(employee.employeeName).includes(asText(query)) || asText(employee.employeeId).includes(asText(query)))
  }, [employees, query, selectedDepartment])

  const scanCandidates = deployedEmployees.length > 0 ? deployedEmployees : fallbackDepartmentEmployees

  const selectedEmployee = scanCandidates.find((employee) => employee.employeeId === selectedEmployeeId) || scanCandidates[0] || null

  useEffect(() => {
    if (scanCandidates.length === 0) {
      setSelectedEmployeeId('')
      return
    }

    if (!scanCandidates.some((employee) => employee.employeeId === selectedEmployeeId)) {
      setSelectedEmployeeId(scanCandidates[0].employeeId)
    }
  }, [scanCandidates, selectedEmployeeId])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Leadman reporting"
        title="Report Dashboard"
        description="Use this page to create reports for deployed workers. Transfer approvals, deployed workers, and the daily report live on separate pages."
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card>
          <SectionTitle
            icon={ScanLine}
            hint="Open the report form and select the deployed worker to include in this report."
            action={(
              <Button onClick={() => setScanModalOpen(true)} disabled={scanCandidates.length === 0}>
                <ScanLine className="h-4 w-4" /> Create Report
              </Button>
            )}
          >
            Create Report
          </SectionTitle>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search deployed workers..." className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none" />
          </div>

          <div className="mt-5 space-y-3">
            {scanCandidates.length === 0 ? (
              <EmptyState title="No deployed workers" description={`No employees found in ${selectedDepartment} yet.`} />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {scanCandidates.map((employee) => (
                  <div key={employee.employeeId} onClick={() => { setSelectedEmployeeId(employee.employeeId); setScanModalOpen(true) }}>
                    <EmployeeCard
                      employee={{
                        employeeId: employee.employeeId,
                        employeeName: employee.employeeName,
                        role: employee.role || 'Worker',
                        department: employee.department,

                      }}
                      showActions={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      <ReportEntryModal
        open={scanModalOpen}
        department={selectedDepartment}
        employeeOptions={scanCandidates}
        initialEmployeeId={selectedEmployeeId}
        title="Create Report"
        description="Select a deployed employee and fill the department report details for this entry."
        submitLabel="Create Report"
        onClose={() => setScanModalOpen(false)}
        onSubmit={(payloads) => {
          const list = Array.isArray(payloads) ? payloads : [payloads]
          if (list.length === 0) return
          setSelectedEmployeeId(list[0].employeeId)
          list.forEach((payload) => addReportEntry(payload))
          setScanModalOpen(false)
          dialog.success({
            title: 'Report recorded',
            message: 'The worker report was submitted successfully.',
          })
        }}
      />
    </div>
  )
}