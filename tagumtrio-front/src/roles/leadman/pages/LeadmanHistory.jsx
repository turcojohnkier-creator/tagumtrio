import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import DailyReportTable from '../../../shared/reports/DailyReportTable'
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

// Plain, read-only record of past submissions — rejected reports needing
// action live on the Incoming Reports page's Rejected tab instead, so this
// page stays a simple recent-history list.
export default function LeadmanHistory() {
  const { user } = useAuth()
  const { formatDateTime, selectedLeadmanDepartment } = useAppData()

  const currentDepartment = selectedLeadmanDepartment || (user?.departments?.[0] || user?.department || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
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

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        eyebrow="History"
        title="Submitted Reports"
        actions={(
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:gap-3">
            <div className="rounded-lg border border-white/20 bg-white/10 p-2.5 select-none sm:p-3 sm:min-w-[180px]">
              <p className="text-xs font-semibold text-emerald-50/90">Department</p>
              <p className="mt-1 truncate text-white sm:mt-1.5">{currentDepartment || 'Assigned department'}</p>
            </div>
            <div className="rounded-lg border border-white/20 bg-white/10 p-2.5 sm:p-3">
              <p className="text-xs text-emerald-50/90">Date</p>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full bg-transparent text-white outline-none [color-scheme:dark] sm:mt-1.5" />
            </div>
            <div className="col-span-2 rounded-lg border border-white/20 bg-white/10 p-2.5 sm:col-span-1 sm:p-3 sm:min-w-[220px]">
              <p className="text-xs text-emerald-50/90">Search</p>
              <div className="relative mt-1 sm:mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-50/70" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports..." className="w-full bg-transparent pl-9 text-white placeholder:text-emerald-50/60 outline-none" />
              </div>
            </div>
          </div>
        )}
      />

      <Card>
        {loading ? <div className="text-zinc-500">Loading...</div> : null}
        {!loading && filtered.length === 0 ? <EmptyState title="No reports found" description="No reports found for selected filters." /> : null}
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report.id} className="rounded-xl border border-zinc-200 bg-zinc-50 py-2 px-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-zinc-900">{report.department} • {report.reportDate}</div>
                <div className="text-xs text-zinc-500 mt-1">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {formatDateTime(report.createdAt || report.created_at || report.reportDate)}</div>
                <div className="text-sm text-zinc-700 mt-1">Entries: {Array.isArray(report.entries) ? report.entries.length : 0}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setSelected(report)}>Open</Button>
            </div>
          ))}
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
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
              <div className="px-5 py-4">
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
        </div>
      ) : null}
    </div>
  )
}
