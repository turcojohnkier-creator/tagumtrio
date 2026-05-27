import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ClipboardList, ScanLine, Search } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import DepartmentScanModal from '../../components/leadman/DepartmentScanModal'

function asText(value) {
  return String(value || '').toLowerCase()
}

export default function LeadmanDashboard() {
  const { user } = useAuth()
  const { departmentRequests, employees, getLeadmanAttendance, recordAttendanceScan, formatDateTime, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useQr()

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
    return departmentRequests
      .filter((request) => request.status === 'approved' && request.requestedDepartment === selectedDepartment)
      .map((request) => ({
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        department: request.requestedDepartment,
        approvedAt: request.leadmanAt,
      }))
      .filter((employee) => employee.employeeId && employee.employeeName)
      .filter((employee) => asText(employee.employeeName).includes(asText(query)) || asText(employee.employeeId).includes(asText(query)))
  }, [departmentRequests, query, selectedDepartment])

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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Leadman scanning</p>
            <h2 className="mt-2 text-2xl font-bold text-white">QR Scan Dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">Use this page to scan deployed workers. Transfer approvals, deployed workers, and the daily report live on separate pages.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-2 w-full min-w-[220px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Deployed workers</p>
            <p className="mt-2 text-2xl font-bold text-white">{stats.deployed}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Scans</p>
            <p className="mt-2 text-2xl font-bold text-white">{stats.scans}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Pending transfers</p>
            <p className="mt-2 text-2xl font-bold text-white">{stats.pending}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><ScanLine className="h-5 w-5 text-emerald-400" /> QR Scan</h3>
              <p className="mt-1 text-sm text-slate-400">Open the scan form and select the deployed worker being scanned.</p>
            </div>
            <button onClick={() => setScanModalOpen(true)} disabled={scanCandidates.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
              <ScanLine className="h-4 w-4" /> Start Scan
            </button>
          </div>

          <div className="mt-5 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search deployed workers..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:border-emerald-500 focus:outline-none" />
          </div>

          <div className="mt-5 space-y-3">
            {scanCandidates.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No employees found in {selectedDepartment} yet.</div>
            ) : (
              scanCandidates.map((employee) => (
                <button key={employee.employeeId} onClick={() => { setSelectedEmployeeId(employee.employeeId); setScanModalOpen(true) }} className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-left transition-colors hover:border-slate-700 hover:bg-slate-900">
                  <div>
                    <p className="font-medium text-white">{employee.employeeName}</p>
                    <p className="mt-1 text-sm text-slate-400">{employee.employeeId}{employee.approvedAt ? ` • approved ${formatDateTime(employee.approvedAt)}` : ''}</p>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-slate-500">Tap to scan</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><BadgeCheck className="h-5 w-5 text-cyan-400" /> Recent Scans</h3>
            <div className="mt-4 space-y-3">
              {currentScans.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No scans recorded yet.</div>
              ) : (
                currentScans.slice(0, 4).map((record) => (
                  <div key={record.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <p className="font-medium text-white">{record.employeeName}</p>
                    <p className="mt-1 text-sm text-slate-400">{record.department} • {formatDateTime(record.scannedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><ClipboardList className="h-5 w-5 text-amber-400" /> What moves out</h3>
            <p className="mt-3 text-sm text-slate-400">Transfer approvals, deployed workers, and daily reports are now on their own pages in the left menu.</p>
          </div>
        </div>
      </div>

      <DepartmentScanModal
        open={scanModalOpen}
        department={selectedDepartment}
        employeeOptions={scanCandidates}
        initialEmployeeId={selectedEmployeeId}
        title="Start QR Scan"
        description="Select a deployed employee and fill the department QR details for this scan."
        submitLabel="Record Scan"
        onClose={() => setScanModalOpen(false)}
        onSubmit={(payloads) => {
          const list = Array.isArray(payloads) ? payloads : [payloads]
          if (list.length === 0) return
          setSelectedEmployeeId(list[0].employeeId)
          list.forEach((payload) => recordAttendanceScan(payload))
          setScanModalOpen(false)
        }}
      />
    </div>
  )
}