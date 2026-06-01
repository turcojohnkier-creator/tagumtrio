import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import DailyReportTable from '../../components/reports/DailyReportTable'
import { fetchDailyReportsApi } from '../../lib/api'

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

export default function LeadmanHistory() {
  const { user } = useAuth()
  const { formatDateTime, selectedLeadmanDepartment } = useQr()

  const currentDepartment = selectedLeadmanDepartment || (user?.departments?.[0] || user?.department || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchDailyReportsApi({ department: currentDepartment || undefined, reportDate: date || undefined })
      .then((r) => {
        if (!mounted) return
        if (!Array.isArray(r)) return setReports([])
        const filteredByDept = r.filter((rep) => String(rep.department || '').toLowerCase() === String(currentDepartment || '').toLowerCase())
        setReports(filteredByDept)
      })
      .catch(() => { if (mounted) setReports([]) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">History</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Submitted Reports</h2>
          <p className="mt-1 text-sm text-slate-400">View recent submitted reports and send a consolidated daily report.</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3 min-w-[220px] select-none pointer-events-none">
            <p className="text-xs text-slate-500">Department</p>
            <p className="mt-2 text-white">{currentDepartment || 'Assigned department'}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-500">Date</p>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 bg-transparent text-white outline-none" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-500">Search</p>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports..." className="pl-10 bg-transparent text-white outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        {loading ? <div className="text-slate-400">Loading...</div> : null}
        {!loading && filtered.length === 0 ? <div className="text-slate-400">No reports found for selected filters.</div> : null}
        <div className="space-y-3">
          {filtered.map((report) => (
            <div key={report.id} className="rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-white">{report.department} • {report.reportDate}</div>
                <div className="text-xs text-slate-400 mt-1">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {formatDateTime(report.createdAt || report.created_at || report.reportDate)}</div>
                <div className="text-sm text-slate-300 mt-1">Entries: {Array.isArray(report.entries) ? report.entries.length : 0}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelected(report)} className="rounded-xl bg-slate-800 px-3 py-1.5 text-slate-200">Open</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Submitted daily report</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{selected.department} • {selected.reportDate}</h3>
                <p className="mt-1 text-sm text-slate-400">Submitted by {selected.submittedByName || selected.submittedBy || 'Unknown'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300">Close</button>
              </div>
            </div>
            <div className="max-h-[72vh] overflow-auto px-5 py-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employees involved</p>
                  <p className="mt-2 text-2xl font-bold text-white">{new Set((selected.entries || []).map((e) => String(e.employeeId || e.employeeName || ''))).size}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total entries</p>
                  <p className="mt-2 text-2xl font-bold text-white">{(selected.entries || []).length}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total pieces</p>
                  <p className="mt-2 text-2xl font-bold text-white">{aggregateReport([selected]).totalPieces}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total amount</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-400">₱{aggregateReport([selected]).totalAmount.toLocaleString()}</p>
                </div>
              </div>
              <DailyReportTable entries={selected.entries || []} fallbackDepartment={selected.department || currentDepartment} />
            </div>
          </div>
        </div>
      ) : null}

    </div>
  )
}
