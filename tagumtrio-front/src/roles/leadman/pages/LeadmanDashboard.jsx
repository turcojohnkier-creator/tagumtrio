import { useMemo, useState } from 'react'
import { ChevronRight, Plus, ScanLine, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import useAttendance, { formatSessionTime } from '../../../shared/hooks/useAttendance'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import ReportEntryForm from '../../../roles/leadman/components/ReportEntryForm'
import { useDialog } from '../../../context/dialog-context'
import PageHeader from '../../../shared/ui/PageHeader'
import Card, { SectionTitle } from '../../../shared/ui/Card'
import Portal from '../../../shared/ui/Portal'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'
import ReportDetailModal from '../../../shared/reports/ReportDetailModal'
import PrintableReport from '../../../shared/reports/PrintableReport'
import { buildReportEntry } from '../../../shared/reports/build-report-entry'
import { getStatusLabel, getStatusVariant } from '../../../shared/reports/report-status'
import { formatProductWithUnit } from '../../../lib/units'
import { toManilaDateKey } from '../../../lib/datetime'

function entryPieces(entry) {
  const pieces = Number(entry.quantity || entry.pieces || entry.raw?.qrFields?.pieces || entry.qrFields?.pieces || entry.raw?.qrFields?.cratePieces || entry.qrFields?.cratePieces || entry.raw?.qrFields?.crates || entry.qrFields?.crates || 0)
  return Number.isFinite(pieces) ? pieces : 0
}

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

export default function LeadmanDashboard() {
  const { user } = useAuth()
  const { employees, dailyReports, submitDailyReport, selectedLeadmanDepartment, setSelectedLeadmanDepartment } = useAppData()
  const dialog = useDialog()
  const [creating, setCreating] = useState(false)
  const [viewingReportId, setViewingReportId] = useState('')

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''

  const { status: attendance, presentIds, isOpen: attendanceOpen } = useAttendance(selectedDepartment, {
    enabled: Boolean(selectedDepartment),
  })

  // Every worker marked present for the current session goes into the report
  // automatically. Outside a session (before 7 AM, lunch, after 6 PM) nobody
  // is present, so the list is empty and no report can be created.
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

  // Reports this leadman sent today for the selected department, newest first.
  const today = toManilaDateKey()
  const submittedToday = useMemo(() => {
    return (Array.isArray(dailyReports) ? dailyReports : [])
      .filter((report) => String(report.department || '').toLowerCase() === selectedDepartment.toLowerCase())
      .filter((report) => String(report.reportDate || report.report_date || '') === today)
      .filter((report) => String(report.submittedBy ?? '') === String(user?.id ?? ''))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [dailyReports, selectedDepartment, today, user?.id])

  const viewingReport = submittedToday.find((report) => String(report.id) === String(viewingReportId)) || null

  let attendanceNotice = null
  if (!attendance) {
    attendanceNotice = 'Loading attendance…'
  } else if (!attendanceOpen) {
    const opensAt = formatSessionTime(attendance.nextSession?.start)
    attendanceNotice = attendance.state === 'lunch'
      ? `Lunch break: no workers are present. Reports can be created again from ${opensAt}.`
      : attendance.state === 'ended'
        ? `The work day has ended: no workers are present. Reports can be created again tomorrow from ${opensAt}.`
        : `No session has started yet. Reports can be created from ${opensAt}.`
  } else if (scanCandidates.length === 0) {
    attendanceNotice = 'No workers are marked present for this session. Switch them on in Deployed Workers first.'
  }

  const canCreate = attendanceOpen && scanCandidates.length > 0

  // Confirm & Submit in the form sends the report straight for verification.
  // Throwing keeps the form open and shows the error in its review window.
  async function handleCreate(payloads) {
    const list = Array.isArray(payloads) ? payloads : [payloads]
    if (list.length === 0) return
    const entries = list.map(buildReportEntry)
    const totalPieces = entries.reduce((sum, entry) => sum + entryPieces(entry), 0)
    const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const summary = `Consolidated report • ${entries.length} rows • ${totalPieces} crates/pieces • ₱${totalAmount.toLocaleString()}`

    await submitDailyReport(selectedDepartment, today, user?.id || null, user?.name || null, summary, entries)

    setCreating(false)
    const nextDepartment = entries[0]?.targetDepartment
    dialog.success({
      title: 'Report submitted',
      message: nextDepartment
        ? `The report was sent to ${nextDepartment} for verification.`
        : 'The report was submitted for verification.',
    })
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
        <SectionTitle icon={ScanLine} hint="Tap + to create a report. Workers marked present are included automatically, and the report is sent for verification right away.">
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

        <button
          type="button"
          onClick={() => setCreating(true)}
          disabled={!canCreate}
          aria-label="Create a report"
          className="group flex h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-50 disabled:text-zinc-400"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-transform group-hover:scale-105 group-disabled:scale-100 group-disabled:bg-zinc-300">
            <Plus className="h-12 w-12" strokeWidth={2.5} />
          </span>
          <span className="text-base font-semibold">Create a report</span>
          {canCreate ? (
            <span className="text-sm text-emerald-700/80">{scanCandidates.length} worker{scanCandidates.length === 1 ? '' : 's'} present</span>
          ) : null}
        </button>
      </Card>

      <Card className="space-y-4">
        <SectionTitle hint="Reports you sent today for this department. Open one to see its details or print it.">
          Submitted today
        </SectionTitle>

        {submittedToday.length === 0 ? (
          <EmptyState title="No reports submitted today yet" />
        ) : (
          <div className="grid gap-3">
            {submittedToday.map((report) => {
              const entries = Array.isArray(report.entries) ? report.entries : []
              const firstEntry = entries[0] || {}
              const employeeCount = new Set(entries.map((entry) => String(entry.employeeId ?? entry.employeeName ?? ''))).size
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setViewingReportId(report.id)}
                  className="group flex w-full flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-white md:flex-row md:items-center md:gap-5"
                >
                  <div className="min-w-0 md:w-40">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{formatTime(report.createdAt)}</p>
                  </div>

                  <div className="grid flex-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Employees</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{employeeCount}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Product</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{firstEntry.product ? formatProductWithUnit(firstEntry.product, report.department) : '-'}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Quantity</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{firstEntry.quantity || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 md:flex-col md:items-end">
                    <Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      Open report <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {creating ? (
        <Portal>
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
            <div className="flex min-h-full items-center justify-center py-8">
              <div className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Create report</p>
                    <h3 className="mt-0.5 font-heading text-lg font-bold text-zinc-900">{selectedDepartment}</h3>
                  </div>
                  <button type="button" onClick={() => setCreating(false)} aria-label="Close" className="btn-dismiss rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 hover:bg-zinc-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[78vh] overflow-auto p-6">
                  <ReportEntryForm
                    department={selectedDepartment}
                    employeeOptions={scanCandidates}
                    submitLabel="Create Report"
                    onSubmit={handleCreate}
                  />
                </div>
              </div>
            </div>
          </div>
        </Portal>
      ) : null}

      <ReportDetailModal
        report={viewingReport}
        onClose={() => setViewingReportId('')}
        actions={[{ key: 'print', label: 'Print / Save as PDF', variant: 'secondary', onClick: () => window.print() }]}
      />
      <PrintableReport report={viewingReport} />
    </div>
  )
}
