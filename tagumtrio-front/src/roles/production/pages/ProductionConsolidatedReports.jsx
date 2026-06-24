import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, CalendarDays, ClipboardList, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fetchDailyReportsApi } from '../../../lib/api'
import { getEntryIdentifier, getEntryLabel, getEntryPieces, hasMeaningfulEntry } from '../../../shared/reports/report-entry-utils'

function formatDate(value) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getFieldValue(entry, key) {
  return entry?.raw?.qrFields?.[key] ?? entry?.qrFields?.[key] ?? entry?.[key] ?? ''
}

function resolveEntryDepartment(entry, fallbackDepartment) {
  return entry?.department || entry?.raw?.department || entry?.raw?.qrFields?.department || entry?.qrFields?.department || fallbackDepartment || '-'
}

function entryRowKey(entry, fallbackIndex = 0) {
  return String(
    entry?.id
    || entry?.batchId
    || entry?.raw?.batchId
    || `${getEntryIdentifier(entry)}-${getEntryLabel(entry)}-${entry?.scannedAt || entry?.batchCapturedAt || fallbackIndex}`
  )
}

function dedupeEntries(entries = []) {
  const seen = new Set()
  return (Array.isArray(entries) ? entries : []).filter((entry, index) => {
    const key = entryRowKey(entry, index)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function EmployeePopup({ open, entries, onClose, onSelectEntry }) {
  if (!open) return null

  const safeEntries = dedupeEntries(entries)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Employees involved</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Included employees</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Employee No.</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Crates / Pieces</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {safeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No employee rows available.</td>
                  </tr>
                ) : (
                  safeEntries.map((entry, index) => (
                    <tr
                      key={entryRowKey(entry, index)}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectEntry?.(entry)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSelectEntry?.(entry)
                        }
                      }}
                      className="cursor-pointer select-none text-slate-300 transition-colors hover:bg-emerald-500/10 active:bg-emerald-500/20"
                    >
                      <td className="px-4 py-4 font-semibold text-white">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{getEntryIdentifier(entry) || '-'}</div>
                      </td>
                      <td className="px-4 py-4">{resolveEntryDepartment(entry, '')}</td>
                      <td className="px-4 py-4">{getEntryPieces(entry) || '-'}</td>
                      <td className="px-4 py-4">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatDate(entry.scannedAt || entry.batchCapturedAt || new Date().toISOString())}</td>
                      <td className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Open full report</td>
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

function ScanEntryModal({ entry, report, onClose }) {
  if (!entry) return null

  const totalPieces = getEntryPieces(entry) || report?.cratesPieces || '-'
  const amount = Number(entry.amount || 0)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Scan entry</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{getEntryLabel(entry) || 'Untitled item'}</h3>
            <p className="mt-1 text-sm text-slate-400">{resolveEntryDepartment(entry, report?.department)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employee / Item</p>
            <p className="mt-2 text-sm font-semibold text-white">{getEntryLabel(entry) || 'Untitled item'}</p>
            <p className="text-xs text-slate-500">{getEntryIdentifier(entry) || '-'}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Crates / Pieces</p>
            <p className="mt-2 text-lg font-semibold text-white">{totalPieces}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date</p>
            <p className="mt-2 text-lg font-semibold text-white">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatDate(entry.scannedAt || report?.scannedAt)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Amount</p>
            <p className="mt-2 text-lg font-semibold text-emerald-400">₱{amount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">Close</button>
        </div>
      </div>
    </div>
  )
}

function buildReportCards(reports = []) {
  return (Array.isArray(reports) ? reports : [])
    .map((report) => {
      const entries = dedupeEntries(Array.isArray(report.entries) ? report.entries.filter(hasMeaningfulEntry) : [])
      const reportDate = report.reportDate || report.report_date || report.createdAt || report.created_at || new Date().toISOString()
      const firstEntry = entries[0] || {}
      const department = report.department || firstEntry.department || 'Unknown Department'
      const thickness = firstEntry.raw?.qrFields?.thickness || firstEntry.qrFields?.thickness || firstEntry.thickness || '-'
      const cratesPieces = firstEntry.raw?.qrFields?.cratePieces || firstEntry.qrFields?.cratePieces || firstEntry.raw?.qrFields?.crates || firstEntry.qrFields?.crates || firstEntry.raw?.qrFields?.pieces || firstEntry.qrFields?.pieces || firstEntry.cratePieces || firstEntry.crates || firstEntry.pieces || '-'
      const scannedAt = report.createdAt || report.created_at || reportDate

      return {
        id: report.id,
        department,
        reportDate,
        scannedAt,
        employeeCount: new Set(entries.map((entry) => String(getEntryIdentifier(entry) || getEntryLabel(entry) || entry.id || ''))).size,
        thickness,
        cratesPieces,
        entries,
        submittedBy: report.submittedByName || report.submitted_by_name || report.submittedBy || report.submitted_by || 'Unknown',
        totalAmount: entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
      }
    })
    .sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0))
}

function ReportDetailModal({ report, onClose }) {
  const [showEmployeePopup, setShowEmployeePopup] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  if (!report) return null

  const safeEntries = dedupeEntries(report.entries)
  const totalPieces = safeEntries.reduce((sum, entry) => {
    const pieces = Number(getEntryPieces(entry) || 0)
    return sum + (Number.isFinite(pieces) ? pieces : 0)
  }, 0)
  const totalAmount = safeEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Consolidated report</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{report.department}</h3>
            <p className="mt-1 text-sm text-slate-400">Submitted {formatDate(report.scannedAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employees involved</p>
              <p className="mt-2 text-2xl font-bold text-white">{report.employeeCount}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
              <p className="mt-2 text-lg font-semibold text-white">{report.department || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Thickness</p>
              <p className="mt-2 text-lg font-semibold text-white">{report.thickness || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Crates / Pieces</p>
              <p className="mt-2 text-lg font-semibold text-white">{report.cratesPieces || '-'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Included employees</p>
            <p className="mt-1 text-sm text-slate-300">{safeEntries.length} row{safeEntries.length === 1 ? '' : 's'} in this consolidated report</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Thickness</th>
                  <th className="px-4 py-3 font-medium">Crates / Pieces</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {safeEntries.map((entry, index) => (
                  <tr key={entryRowKey(entry, index)} className="text-slate-300 hover:bg-slate-900/80">
                    <td className="px-4 py-4 font-semibold text-white">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{getEntryLabel(entry) || 'Untitled item'}</div>
                      <div className="text-xs text-slate-500">{getEntryIdentifier(entry) || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{resolveEntryDepartment(entry, report.department)}</td>
                    <td className="px-4 py-4 text-slate-300">{getFieldValue(entry, 'thickness') || report.thickness || '-'}</td>
                    <td className="px-4 py-4 text-slate-300">{getEntryPieces(entry) || report.cratesPieces || '-'}</td>
                    <td className="px-4 py-4 text-slate-300">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatDate(entry.scannedAt || report.scannedAt)}</td>
                    <td className="px-4 py-4 font-semibold text-white">₱{Number(entry.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submitted by</p>
              <p className="mt-2 text-sm text-slate-200">{report.submittedBy || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date and time scanned</p>
              <p className="mt-2 text-sm text-slate-200">{formatDate(report.scannedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total crates / pieces</p>
              <p className="mt-2 text-sm text-slate-200">{totalPieces}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total amount</p>
              <p className="mt-2 text-sm font-semibold text-emerald-400">₱{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
            Close
          </button>
        </div>

        <EmployeePopup
          open={showEmployeePopup}
          entries={safeEntries}
          onClose={() => setShowEmployeePopup(false)}
          onSelectEntry={(entry) => {
            setSelectedEntry(entry)
            setShowEmployeePopup(false)
          }}
        />
        <ScanEntryModal
          entry={selectedEntry}
          report={report}
          onClose={() => setSelectedEntry(null)}
        />
      </div>
    </div>
  )
}

export default function ProductionConsolidatedReports() {
  const [reports, setReports] = useState([])
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
  const selectedReport = useMemo(() => reportCards.find((report) => report.id === selectedReportId) || null, [reportCards, selectedReportId])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Production consolidated</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Consolidated production report cards</h2>
            <p className="mt-1 text-sm text-slate-400">Each card shows the day total. Opening a card reveals the full table for that report.</p>
          </div>
          
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        {reportCards.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">No submitted reports yet.</div>
        ) : (
          <div className="space-y-3">
            {reportCards.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={`group relative block w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 active:translate-y-[1px] active:bg-slate-900 ${selectedReportId === report.id ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20' : ''}`}
              >
                <div className="pr-12 md:flex md:items-center md:gap-5">
                  <div className="min-w-0 md:flex-1">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Consolidated report</p>
                    <h4 className="mt-1 truncate text-lg font-semibold text-white">{report.department || 'Unknown Department'}</h4>
                    <p className="mt-1 text-sm text-slate-400">{formatDate(report.scannedAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-0 md:w-[56%] md:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Employees</p>
                      <p className="mt-1 text-sm font-semibold text-white">{report.employeeCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Crates / Pieces</p>
                      <p className="mt-1 text-sm font-semibold text-white">{report.cratesPieces || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Total amount</p>
                      <p className="mt-1 text-sm font-semibold text-emerald-400">₱{Number(report.totalAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 md:mt-0 md:min-w-[140px] md:flex-col md:items-end md:justify-center">
                    <span>{report.entries.length} row{report.entries.length === 1 ? '' : 's'}</span>
                    <span className="text-slate-300 group-hover:text-white">Open report</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReportId('')} />
    </div>
  )
}
