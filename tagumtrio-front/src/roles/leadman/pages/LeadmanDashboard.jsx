import { useMemo, useState, useEffect } from 'react'
import { BadgeCheck, ClipboardList, ScanLine, Search } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useQr } from '../../../context/qr-context'
import DepartmentScanModal from '../../../roles/leadman/components/DepartmentScanModal'
import { useDialog } from '../../../context/dialog-context'
import EmployeeCard from '../../../roles/leadman/components/EmployeeCard'

function asText(value) {
  return String(value || '').toLowerCase()
}

export default function LeadmanDashboard() {
  const { user } = useAuth()
  const { departmentRequests, employees, getLeadmanDeployedEmployees, getLeadmanAttendance, recordAttendanceScan, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useQr()
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

  const currentScans = useMemo(() => {
    return getLeadmanAttendance(selectedDepartment)
      .filter((record) => record.status === 'leadman_verified')
      .filter((record) => asText(record.employeeName).includes(asText(query)) || asText(record.employeeId).includes(asText(query)) || asText(record.department).includes(asText(query)))
  }, [getLeadmanAttendance, query, selectedDepartment])

  const stats = useMemo(() => {
    return {
      deployed: deployedEmployees.length,
      scans: currentScans.length,
      pending: departmentRequests.filter((request) => request.requestedDepartment === selectedDepartment && request.status === 'pending').length,
    }
  }, [currentScans, departmentRequests, deployedEmployees.length, selectedDepartment])

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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Leadman reporting</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Report Dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Use this page to create reports for deployed workers. Transfer approvals, deployed workers, and the daily report live on separate pages.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-2 w-full min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><ScanLine className="h-5 w-5 text-emerald-700" /> Create Report</h3>
              <p className="mt-1 text-sm text-slate-500">Open the report form and select the deployed worker to include in this report.</p>
            </div>
            <button onClick={() => setScanModalOpen(true)} disabled={scanCandidates.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
              <ScanLine className="h-4 w-4" /> Create Report
            </button>
          </div>

          <div className="mt-5 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search deployed workers..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none" />
          </div>

          <div className="mt-5 space-y-3">
            {scanCandidates.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No employees found in {selectedDepartment} yet.</div>
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
        </div>

        <div className="space-y-6">
          

        
        </div>
      </div>

      <DepartmentScanModal
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
          list.forEach((payload) => recordAttendanceScan(payload))
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