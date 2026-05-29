import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, ClipboardList, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchDailyReportsApi } from '../../lib/api'

function formatDate(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getReportTotalAmount(report) {
  const entries = Array.isArray(report.entries) ? report.entries : []
  return entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
}

function buildReportCards(reports = []) {
  return (Array.isArray(reports) ? reports : [])
    .map((report) => {
      const entries = Array.isArray(report.entries) ? report.entries : []
      const reportDate = report.reportDate || report.report_date || report.createdAt || report.created_at || new Date().toISOString()

      return {
        id: report.id,
        department: report.department || 'Unknown Department',
        reportDate,
        scannedAt: report.createdAt || report.created_at || reportDate,
        submittedBy: report.submittedByName || report.submitted_by_name || report.submittedBy || report.submitted_by || 'Unknown',
        totalAmount: getReportTotalAmount(report),
        entries,
      }
    })
    .sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0))
}

function ReportDetailModal({ report, onClose }) {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Finance consolidated report</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{report.department}</h3>
            <p className="mt-1 text-sm text-slate-400">Submitted {formatDate(report.scannedAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
            <span className="text-sm">×</span>
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Rows</p>
              <p className="mt-2 text-2xl font-bold text-white">{Array.isArray(report.entries) ? report.entries.length : 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
              <p className="mt-2 text-lg font-semibold text-white">{report.department || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total amount</p>
              <p className="mt-2 text-lg font-semibold text-emerald-400">₱{Number(report.totalAmount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {!Array.isArray(report.entries) || report.entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No entries available.</td>
                  </tr>
                ) : (
                  report.entries.map((entry, index) => (
                    <tr key={entry.id || `${index}-${entry.employeeName || entry.productName || 'entry'}`} className="text-slate-300 hover:bg-slate-900/80">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{entry.employeeName || entry.productName || 'Untitled item'}</div>
                        <div className="text-xs text-slate-500">{entry.employeeId || entry.productId || '-'}</div>
                      </td>
                      <td className="px-4 py-4">{entry.department || report.department}</td>
                      <td className="px-4 py-4">{formatDate(entry.scannedAt || report.scannedAt)}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">₱{Number(entry.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinanceReports() {
  const [reports, setReports] = useState([])
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [selectedReportId, setSelectedReportId] = useState('')

  useEffect(() => {
    let mounted = true
    fetchDailyReportsApi()
      .then((result) => {
        if (mounted) setReports(Array.isArray(result) ? result : [])
      })
      .catch(() => {
        if (mounted) setReports([])
      })
    return () => {
      mounted = false
    }
  }, [])

  const reportCards = useMemo(() => buildReportCards(reports), [reports])
  const departments = useMemo(() => Array.from(new Set(reportCards.map((report) => report.department).filter(Boolean))).sort(), [reportCards])

  const filteredReports = useMemo(() => {
    const search = query.trim().toLowerCase()
    return reportCards.filter((report) => {
      const matchesDepartment = !departmentFilter || report.department === departmentFilter
      const matchesSearch = !search || `${report.department} ${report.reportDate} ${report.submittedBy} ${report.totalAmount} ${JSON.stringify(report.entries || [])}`.toLowerCase().includes(search)
      return matchesDepartment && matchesSearch
    })
  }, [departmentFilter, query, reportCards])

  const selectedReport = useMemo(() => filteredReports.find((report) => report.id === selectedReportId) || filteredReports[0] || null, [filteredReports, selectedReportId])

  useEffect(() => {
    if (!selectedReport) {
      setSelectedReportId('')
      return
    }
    if (!filteredReports.some((report) => report.id === selectedReportId)) {
      setSelectedReportId(selectedReport.id)
    }
  }, [filteredReports, selectedReport, selectedReportId])

  const totals = useMemo(() => {
    return filteredReports.reduce(
      (accumulator, report) => {
        accumulator.reports += 1
        accumulator.entries += Array.isArray(report.entries) ? report.entries.length : 0
        accumulator.salary += Number(report.totalAmount || 0)
        return accumulator
      },
      { reports: 0, entries: 0, salary: 0 }
    )
  }, [filteredReports])

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300">
              <ClipboardList className="h-3.5 w-3.5" />
              Finance Reports
            </div>
            <h2 className="text-3xl font-bold text-white">Daily report cards for payroll tracing</h2>
            <p className="text-sm leading-6 text-slate-400">Open any card to inspect the full table. The consolidated page keeps the daily-report card layout, with the total amount shown on each card.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[420px]">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Reports</p>
              <p className="mt-1 text-xl font-bold text-white">{totals.reports}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Entries</p>
              <p className="mt-1 text-xl font-bold text-white">{totals.entries}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Salary</p>
              <p className="mt-1 text-xl font-bold text-emerald-400">₱{totals.salary.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Report filters</h3>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Search</label>
              <div className="mt-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Department, date, submitted by..." className="w-full bg-transparent text-sm text-white focus:outline-none" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5">
              <label className="text-[11px] uppercase tracking-wider text-slate-500">Department</label>
              <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="mt-1 w-full bg-slate-950 text-sm text-white focus:outline-none">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Summary</p>
              <p className="mt-2 text-sm text-slate-300">This page keeps the daily report card layout but uses the day total as the main figure for finance review.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredReports.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">No submitted daily reports match the current filters.</div>
            ) : (
              filteredReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${selectedReportId === report.id ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-800 bg-slate-950 hover:border-slate-700'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{report.department}</div>
                      <div className="text-xs text-slate-500">{report.reportDate} • {report.submittedBy || 'Unknown'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>{Array.isArray(report.entries) ? report.entries.length : 0} rows</div>
                      <div className="text-emerald-400 font-semibold">₱{Number(report.totalAmount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-xs uppercase tracking-wider text-slate-500">
                <CalendarDays className="h-3.5 w-3.5" />
                Daily report detail
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">{selectedReport ? `${selectedReport.department} • ${selectedReport.reportDate}` : 'Select a report'}</h3>
              <p className="text-sm text-slate-400">Open a card to show the full table for that day.</p>
            </div>

            {selectedReport && (
              <div className="text-sm text-slate-300">
                <p>Submitted by: <span className="text-white font-medium">{selectedReport.submittedBy || 'Unknown'}</span></p>
                <p>Created: <span className="text-white font-medium">{formatDate(selectedReport.scannedAt)}</span></p>
                <p>Total amount: <span className="text-white font-medium">₱{Number(selectedReport.totalAmount || 0).toLocaleString()}</span></p>
              </div>
            )}
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {!selectedReport || !Array.isArray(selectedReport.entries) || selectedReport.entries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No report selected or no entries available.</td>
                  </tr>
                ) : (
                  selectedReport.entries.map((entry, index) => (
                    <tr key={entry.id || `${index}-${entry.employeeName || entry.productName || 'entry'}`} className="text-slate-300 hover:bg-slate-900/80">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{entry.employeeName || entry.productName || 'Untitled item'}</div>
                        <div className="text-xs text-slate-500">{entry.employeeId || entry.productId || '-'}</div>
                      </td>
                      <td className="px-4 py-4">{entry.department || selectedReport.department}</td>
                      <td className="px-4 py-4">{formatDate(entry.scannedAt || selectedReport.scannedAt)}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">₱{Number(entry.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-start">
        <Link to="/app/finance" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 hover:border-slate-700">
          <ClipboardList className="h-4 w-4" /> Back to finance reports
        </Link>
      </div>

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReportId('')} />
    </div>
  )
}
