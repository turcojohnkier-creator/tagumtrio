import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, ClipboardList, Search } from 'lucide-react'
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

  const departments = useMemo(() => {
    return Array.from(new Set(reports.map((report) => report.department).filter(Boolean))).sort()
  }, [reports])

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (departmentFilter && String(report.department || '').toLowerCase() !== String(departmentFilter).toLowerCase()) return false
      const haystack = `${report.department} ${report.reportDate} ${report.submittedByName || ''} ${JSON.stringify(report.entries || [])}`.toLowerCase()
      if (query && !haystack.includes(query.toLowerCase())) return false
      return true
    })
  }, [departmentFilter, query, reports])

  const selectedReport = filteredReports.find((report) => report.id === selectedReportId) || filteredReports[0] || null

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
        accumulator.salary += Array.isArray(report.entries) ? report.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) : 0
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
            <h2 className="text-3xl font-bold text-white">Daily production reports for payroll tracing</h2>
            <p className="text-sm leading-6 text-slate-400">
              Review the submitted daily report rows that feed finance, salary reconciliation, and payout review.
            </p>
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
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Department, date, name, note..." className="w-full bg-transparent text-sm text-white focus:outline-none" />
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
              <p className="mt-2 text-sm text-slate-300">Filter the submitted reports before drilling into a single report. This view is read-only for finance tracing.</p>
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

                  <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 shadow-xl shadow-black/10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Consolidated report</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">Finance summary</h3>
                        <p className="mt-1 text-sm text-slate-400">Review the total salary and entry counts across the selected submitted reports.</p>
                      </div>
                      <div className="text-sm text-slate-400">Visible reports: <span className="font-semibold text-white">{filteredReports.length}</span></div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reports</p>
                        <p className="mt-2 text-2xl font-bold text-white">{totals.reports}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Entries</p>
                        <p className="mt-2 text-2xl font-bold text-white">{totals.entries}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Departments</p>
                        <p className="mt-2 text-2xl font-bold text-white">{departments.length}</p>
                      </div>
                      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Salary total</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-400">₱{totals.salary.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                      <div className="text-xs text-slate-500">{report.reportDate} • {report.submittedByName || report.submittedBy || 'Unknown'}</div>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <div>{Array.isArray(report.entries) ? report.entries.length : 0} lines</div>
                      <div className="text-emerald-400 font-semibold">₱{Number(Array.isArray(report.entries) ? report.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0) : 0).toLocaleString()}</div>
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
              <p className="text-sm text-slate-400">Every row here comes from a submitted production report and can be traced back to payroll.</p>
            </div>

            {selectedReport && (
              <div className="text-sm text-slate-300">
                <p>Submitted by: <span className="text-white font-medium">{selectedReport.submittedByName || selectedReport.submittedBy || 'Unknown'}</span></p>
                <p>Created: <span className="text-white font-medium">{formatDate(selectedReport.createdAt || selectedReport.created_at)}</span></p>
                <p>Entries: <span className="text-white font-medium">{Array.isArray(selectedReport.entries) ? selectedReport.entries.length : 0}</span></p>
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
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">No report selected or no entries available.</td>
                  </tr>
                ) : (
                  selectedReport.entries.map((entry) => (
                    <tr key={entry.id} className="text-slate-300 hover:bg-slate-900/80">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{entry.employeeName}</div>
                        <div className="text-xs text-slate-500">{entry.employeeId || '-'}</div>
                      </td>
                      <td className="px-4 py-4">{entry.department || selectedReport.department}</td>
                      <td className="px-4 py-4">{formatDate(selectedReport.createdAt || selectedReport.created_at)}</td>
                      <td className="px-4 py-4 font-semibold text-emerald-400">₱{Number(entry.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}