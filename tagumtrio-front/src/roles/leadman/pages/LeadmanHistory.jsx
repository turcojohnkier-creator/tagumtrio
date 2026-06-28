import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import DailyReportTable from '../../../shared/reports/DailyReportTable'
import ReportEntryForm from '../components/ReportEntryForm'
import { fetchDailyReportsApi } from '../../../lib/api'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

function asText(v) { return String(v || '').toLowerCase() }

function aggregateReport(reports = []) {
  return reports.reduce(
    (acc, report) => {
      const entries = Array.isArray(report.entries) ? report.entries : []
      const pieces = entries.reduce((sum, item) => sum + Number(item.pieces || item.quantity || 0), 0)
      const amount = entries.reduce((sum, item) => sum + Number(item.amount || item.total || 0), 0)
      acc.totalPieces += pieces
      acc.totalAmount += amount
      return acc
    },
    { totalPieces: 0, totalAmount: 0 }
  )
}

function buildEntriesFromPayloads(payloads, batchCapturedAt) {
  return payloads.map((payload) => ({
    id: `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    employeeId: payload.employeeId,
    employeeName: payload.employeeName,
    department: payload.department,
    product: payload.product,
    quantity: payload.quantity,
    pricePerUnit: payload.pricePerUnit,
    amount: payload.amount,
    photos: payload.photos,
    notes: payload.notes,
    scannedAt: batchCapturedAt,
  }))
}

export default function LeadmanHistory() {
  const { user } = useAuth()
  const { formatDateTime, selectedLeadmanDepartment, employees = [], resubmitDailyReport, markNotificationsSeen } = useAppData()

  useEffect(() => {
    markNotificationsSeen('daily_report_rejected')
  }, [])

  const currentDepartment = selectedLeadmanDepartment || (user?.departments?.[0] || user?.department || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [resubmitting, setResubmitting] = useState(null)
  const [loading, setLoading] = useState(false)

  function reload() {
    fetchDailyReportsApi({ department: currentDepartment || undefined, reportDate: date || undefined })
      .then((r) => {
        if (!Array.isArray(r)) return setReports([])
        const filteredByDept = r.filter((rep) => String(rep.department || '').toLowerCase() === String(currentDepartment || '').toLowerCase())
        setReports(filteredByDept)
      })
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDepartment, date])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (Array.isArray(reports) ? reports : []).filter((r) => {
      if (!q) return true
      return [r.department, r.reportDate, r.submittedByName, r.summary].filter(Boolean).some((f) => asText(f).includes(q))
    })
  }, [reports, query])

  const departmentEmployees = useMemo(() => {
    return employees
      .filter((employee) => String(employee.department || '').toLowerCase() === String(currentDepartment || '').toLowerCase())
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.employeeName,
        department: employee.department || currentDepartment,
      }))
  }, [employees, currentDepartment])

  function openResubmit(report) {
    const entries = Array.isArray(report.entries) ? report.entries : []
    const firstEntry = entries[0] || {}
    setResubmitting({
      report,
      initialValues: {
        department: report.department,
        product: firstEntry.product || '',
        quantity: firstEntry.quantity || '',
        date: report.reportDate || new Date().toISOString().slice(0, 10),
      },
      initialSelectedEmployeeIds: entries.map((entry) => String(entry.employeeId || '')).filter(Boolean),
      initialTargetDepartment: report.targetDepartment || '',
      initialPhotoPreview: firstEntry.photos || null,
    })
  }

  async function handleResubmit(payloads) {
    if (!resubmitting?.report?.id) return
    const list = Array.isArray(payloads) ? payloads : [payloads]
    if (list.length === 0) return
    const batchCapturedAt = new Date().toISOString()
    const entries = buildEntriesFromPayloads(list, batchCapturedAt)
    await resubmitDailyReport(resubmitting.report.id, {
      department: list[0].department,
      targetDepartment: list[0].targetDepartment,
      summary: list[0].notes,
      entries,
    })
    setResubmitting(null)
    reload()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="History"
        title="Submitted Reports"
        description="View recent submitted reports and send a consolidated daily report."
        actions={(
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 min-w-[200px] select-none">
              <p className="text-xs font-semibold text-zinc-400">Department</p>
              <p className="mt-1.5 text-zinc-900">{currentDepartment || 'Assigned department'}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400">Date</p>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 bg-transparent text-zinc-900 outline-none" />
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-400">Search</p>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports..." className="pl-9 bg-transparent text-zinc-900 outline-none" />
              </div>
            </div>
          </div>
        )}
      />

      <Card>
        {loading ? <div className="text-zinc-500">Loading...</div> : null}
        {!loading && filtered.length === 0 ? <EmptyState title="No reports found" description="No reports found for selected filters." /> : null}
        <div className="space-y-3">
          {filtered.map((report) => {
            const isRejected = String(report.status || '').toLowerCase() === 'rejected'
            const isOwnReport = String(report.submittedBy || '') === String(user?.id || '')
            return (
              <div key={report.id} className={`rounded-xl border py-2 px-3 flex items-center justify-between ${isRejected ? 'border-rose-200 bg-rose-50/50' : 'border-zinc-200 bg-zinc-50'}`}>
                <div>
                  <div className="font-medium text-zinc-900">{report.department} • {report.reportDate}</div>
                  <div className="text-xs text-zinc-500 mt-1">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {formatDateTime(report.createdAt || report.created_at || report.reportDate)}</div>
                  <div className="text-sm text-zinc-700 mt-1">Entries: {Array.isArray(report.entries) ? report.entries.length : 0}</div>
                  {isRejected ? (
                    <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      Rejected: {report.summary || 'No reason provided.'}
                    </div>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {isRejected && isOwnReport ? (
                    <Button variant="danger" size="sm" onClick={() => openResubmit(report)}>Edit & Resubmit</Button>
                  ) : null}
                  <Button variant="secondary" size="sm" onClick={() => setSelected(report)}>Open</Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted daily report</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{selected.department} • {selected.reportDate}</h3>
                <p className="mt-1 text-sm text-zinc-500">Submitted by {selected.submittedByName || selected.submittedBy || 'Unknown'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700">Close</button>
              </div>
            </div>
            <div className="max-h-[72vh] overflow-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Employees involved</p>
                  <p className="mt-2 font-heading text-2xl font-bold text-zinc-900">{new Set((selected.entries || []).map((e) => String(e.employeeId || e.employeeName || ''))).size}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Total entries</p>
                  <p className="mt-2 font-heading text-2xl font-bold text-zinc-900">{(selected.entries || []).length}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Total pieces</p>
                  <p className="mt-2 font-heading text-2xl font-bold text-zinc-900">{aggregateReport([selected]).totalPieces}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-zinc-400">Total amount</p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-700">₱{aggregateReport([selected]).totalAmount.toLocaleString()}</p>
                </div>
              </div>
              <DailyReportTable entries={selected.entries || []} fallbackDepartment={selected.department || currentDepartment} />
            </div>
          </div>
        </div>
      ) : null}

      {resubmitting ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">Edit & resubmit</p>
                <h3 className="font-heading text-lg font-bold text-zinc-900">{resubmitting.report.department} • {resubmitting.report.reportDate}</h3>
              </div>
              <button onClick={() => setResubmitting(null)} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700">Close</button>
            </div>
            <ReportEntryForm
              department={resubmitting.report.department}
              employeeOptions={departmentEmployees}
              submitLabel="Resubmit Report"
              initialValues={resubmitting.initialValues}
              initialSelectedEmployeeIds={resubmitting.initialSelectedEmployeeIds}
              initialTargetDepartment={resubmitting.initialTargetDepartment}
              initialPhotoPreview={resubmitting.initialPhotoPreview}
              onSubmit={handleResubmit}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
