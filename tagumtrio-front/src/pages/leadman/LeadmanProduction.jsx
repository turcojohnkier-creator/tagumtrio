import { useEffect, useMemo, useState } from 'react'
import { BadgeCheck, ClipboardList, Clock3, MessageSquareWarning, Save, ScanLine, Search, Send, Users, X } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import { DEPARTMENTS } from '../../constants/departments'
import DepartmentScanModal from '../../components/leadman/DepartmentScanModal'
import { useDialog } from '../../context/dialog-context'

function asText(value) {
  return String(value || '').toLowerCase()
}

const REPORT_STORAGE_KEY = 'triops-leadman-report-draft'

export default function LeadmanProduction() {
  const { user } = useAuth()
  const dialog = useDialog()
  const {
    departmentRequests,
    approveDepartmentRequest,
    employees,
    getLeadmanDeployedEmployees,
    getLeadmanDepartmentRequests,
    getLeadmanAttendance,
    getEmployeeAttendance,
    recordAttendanceScan,
    formatDateTime,
  } = useQr()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return [DEPARTMENTS[0]]
  }, [user?.department, user?.departments])

  const [selectedDepartment, setSelectedDepartment] = useState(assignedDepartments[0])
  const [query, setQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [hours, setHours] = useState(8)
  const [scanModalOpen, setScanModalOpen] = useState(false)
  const [transferNote, setTransferNote] = useState('')
  const [reportDraft, setReportDraft] = useState('')
  const [reportSavedAt, setReportSavedAt] = useState(null)

  useEffect(() => {
    if (!assignedDepartments.includes(selectedDepartment)) {
      setSelectedDepartment(assignedDepartments[0])
    }
  }, [assignedDepartments, selectedDepartment])

  useEffect(() => {
    if (!user) return
    const key = `${REPORT_STORAGE_KEY}:${user.id}:${selectedDepartment}`
    const saved = window.localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setReportDraft(parsed.reportDraft || '')
        setReportSavedAt(parsed.reportSavedAt || null)
      } catch {
        setReportDraft('')
        setReportSavedAt(null)
      }
    } else {
      setReportDraft('')
      setReportSavedAt(null)
    }
  }, [selectedDepartment, user])

  const departmentTransferRequests = useMemo(() => {
    return departmentRequests.filter((request) => request.requestedDepartment === selectedDepartment && request.status === 'pending')
  }, [departmentRequests, selectedDepartment])

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

  const rosterEmployees = useMemo(() => {
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

  const scanCandidates = deployedEmployees.length > 0 ? deployedEmployees : rosterEmployees

  const currentScans = useMemo(() => {
    return getLeadmanAttendance(selectedDepartment)
      .filter((record) => record.status === 'leadman_verified')
      .filter((record) => asText(record.employeeName).includes(asText(query)) || asText(record.employeeId).includes(asText(query)) || asText(record.department).includes(asText(query)))
  }, [getLeadmanAttendance, query, selectedDepartment])

  const stats = useMemo(() => {
    const verified = currentScans
    return {
      transfers: departmentTransferRequests.length,
      deployed: deployedEmployees.length,
      scans: verified.length,
      hours: verified.reduce((sum, record) => sum + Number(record.loggedHours || 0), 0),
    }
  }, [currentScans, departmentTransferRequests.length, deployedEmployees.length])

  function openScan(employee) {
    setSelectedEmployee(employee)
    setHours(8)
    setScanModalOpen(true)
  }

  function saveDraft() {
    if (!user) return
    const key = `${REPORT_STORAGE_KEY}:${user.id}:${selectedDepartment}`
    const payload = {
      reportDraft,
      reportSavedAt: new Date().toISOString(),
    }
    window.localStorage.setItem(key, JSON.stringify(payload))
    setReportSavedAt(payload.reportSavedAt)
  }

  function submitReport() {
    saveDraft()
    // In this demo, the final report is saved locally. This can later be sent to admin.
  }

  function handleTransferAction(request, action) {
    if (action === 'approve') {
      approveDepartmentRequest(request.id, user?.id || 'LD-001')
      return
    }

    if (action === 'discuss') {
      const note = transferNote.trim() || 'Discussed with admin for manual review.'
      window.localStorage.setItem(
        `triops-transfer-note:${request.id}`,
        JSON.stringify({
          requestId: request.id,
          employeeId: request.employeeId,
          employeeName: request.employeeName,
          department: request.requestedDepartment,
          note,
          leadmanId: user?.id || 'LD-001',
          discussedAt: new Date().toISOString(),
        })
      )
      setTransferNote('')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Leadman Department View</h2>
            <p className="text-slate-400 mt-1">Choose your assigned department, manage transfers, scan deployed workers, and save your daily report draft before submission.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 min-w-[240px] w-full xl:w-auto">
            <p className="text-slate-500 text-xs uppercase tracking-wider">Assigned Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} className="mt-2 w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Transfer Requests</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.transfers}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Deployed Workers</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.deployed}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Leadman Reports</p>
          <p className="text-2xl font-bold text-white mt-2">{stats.scans}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2"><BadgeCheck className="w-5 h-5 text-emerald-400" /> Transfer Requests</h3>
            <span className="text-sm text-slate-400">Approve or discuss with admin</span>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="text" placeholder="Search transfer requests..." className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>

          {departmentTransferRequests.length === 0 ? (
            <div className="text-slate-400 p-4 rounded-lg border border-slate-800">No transfer requests for {selectedDepartment}.</div>
          ) : (
            <div className="space-y-3">
              {departmentTransferRequests.map((request) => (
                <div key={request.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-white font-medium">{request.employeeName}</p>
                      <p className="text-sm text-slate-400">{request.employeeId} • wants {request.requestedDepartment}</p>
                      <p className="text-xs text-slate-500 mt-1">Requested {formatDateTime(request.requestedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => handleTransferAction(request, 'approve')} className="px-4 py-2 bg-emerald-500 text-black rounded font-medium">Approve</button>
                      <button onClick={() => handleTransferAction(request, 'discuss')} className="px-4 py-2 bg-slate-800 text-slate-200 rounded font-medium">Discuss with admin</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Users className="w-5 h-5 text-cyan-400" /> Deployed Workers</h3>
              <span className="text-sm text-slate-400 block mt-1">Current department roster</span>
            </div>
              <button onClick={() => {
                if (scanCandidates.length > 0) {
                  openScan(scanCandidates[0])
              }
              }} disabled={scanCandidates.length === 0} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
              <ScanLine className="w-4 h-4" /> Create Report
            </button>
          </div>

          <div className="space-y-3">
              {scanCandidates.length === 0 ? (
              <div className="text-slate-400 p-4 rounded-lg border border-slate-800">No deployed employees in {selectedDepartment} yet.</div>
            ) : (
                scanCandidates.map((employee) => {
                const employeeAttendance = getEmployeeAttendance(employee.employeeId).filter((record) => record.status === 'leadman_verified')
                return (
                  <div key={employee.employeeId} className="bg-slate-950 p-4 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors">
                    <p className="text-white font-medium">{employee.employeeName}</p>
                    <p className="text-sm text-slate-400 mt-1">{employee.employeeId} • {employee.department}</p>
                    
                    <p className="text-xs text-slate-500 mt-1">Scans waiting for head verification: {employeeAttendance.length}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-amber-400" /> Recent Reports</h3>
          {currentScans.length === 0 ? (
            <div className="text-slate-400 p-4 rounded-lg border border-slate-800">No scans recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {currentScans.map((record) => (
                <div key={record.id} className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{record.employeeName}</p>
                      <p className="text-sm text-slate-400">{record.department} • {formatDateTime(record.scannedAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-amber-400">Waiting for production incharged</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2"><MessageSquareWarning className="w-5 h-5 text-cyan-400" /> Daily Report</h3>
          <p className="text-sm text-slate-400">Write your end-of-day report here. You can save it as a draft or submit the final version.</p>
          <textarea
            value={reportDraft}
            onChange={(e) => setReportDraft(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
            placeholder={`Department: ${selectedDepartment}\nShift summary...\nIssues encountered...\nActions taken...`}
          />
          <div className="flex items-center justify-between gap-3 flex-wrap text-sm text-slate-400">
            <p>{reportSavedAt ? `Draft saved at ${formatDateTime(reportSavedAt)}` : 'No draft saved yet.'}</p>
            <div className="flex items-center gap-2">
              <button onClick={saveDraft} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg">
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button onClick={submitReport} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg font-medium">
                <Send className="w-4 h-4" /> Submit Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <DepartmentScanModal
        open={scanModalOpen && Boolean(selectedEmployee)}
        department={selectedDepartment}
        employeeOptions={selectedEmployee ? [selectedEmployee] : deployedEmployees}
        initialEmployeeId={selectedEmployee?.employeeId || ''}
        initialHours={hours}
        title="Create Report"
        description="Leadman report time is captured automatically and the department fields are recorded with the entry."
        submitLabel="Create Report"
        onClose={() => setScanModalOpen(false)}
        onSubmit={(payloads) => {
          const list = Array.isArray(payloads) ? payloads : [payloads]
          if (list.length === 0) return
          setHours(list[0].loggedHours)
          list.forEach((payload) => recordAttendanceScan(payload))
          setScanModalOpen(false)
          setSelectedEmployee(null)
          dialog.success({
            title: 'Report recorded',
            message: 'The worker report was submitted successfully.',
          })
        }}
      />
    </div>
  )
}
