import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { fetchDailyReportsApi } from '../../../lib/api'
import { getEntryIdentifier, getEntryLabel, getEntryPieces, hasMeaningfulEntry } from '../../../shared/reports/report-entry-utils'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

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
      <div className="w-full max-w-4xl rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Employees involved</p>
            <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">Included employees</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">
          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Employee No.</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Crates / Pieces</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 bg-white/50">
                {safeEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">No employee rows available.</td>
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
                      className="cursor-pointer select-none text-zinc-700 transition-colors hover:bg-emerald-500/10 active:bg-emerald-500/20"
                    >
                      <td className="px-4 py-4 font-semibold text-zinc-900">{index + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-medium text-zinc-900">{getEntryIdentifier(entry) || '-'}</div>
                      </td>
                      <td className="px-4 py-4">{resolveEntryDepartment(entry, '')}</td>
                      <td className="px-4 py-4">{getEntryPieces(entry) || '-'}</td>
                      <td className="px-4 py-4">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatDate(entry.scannedAt || entry.batchCapturedAt || new Date().toISOString())}</td>
                      <td className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-wide text-emerald-700">Open full report</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
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
      <div className="w-full max-w-3xl rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Scan entry</p>
            <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{getEntryLabel(entry) || 'Untitled item'}</h3>
            <p className="mt-1 text-sm text-zinc-500">{resolveEntryDepartment(entry, report?.department)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Employee / Item</p>
            <p className="mt-2 text-sm font-semibold text-zinc-900">{getEntryLabel(entry) || 'Untitled item'}</p>
            <p className="text-xs text-zinc-400">{getEntryIdentifier(entry) || '-'}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Crates / Pieces</p>
            <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{totalPieces}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Date</p>
            <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatDate(entry.scannedAt || report?.scannedAt)}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Amount</p>
            <p className="mt-2 text-lg font-semibold text-emerald-700">₱{amount.toLocaleString()}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
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
      <div className="w-full max-w-5xl rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Consolidated report</p>
            <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{report.department}</h3>
            <p className="mt-1 text-sm text-zinc-500">Submitted {formatDate(report.scannedAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Employees involved</p>
              <p className="mt-2 font-heading text-2xl font-bold text-zinc-900">{report.employeeCount}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Department</p>
              <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{report.department || '-'}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Thickness</p>
              <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{report.thickness || '-'}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Crates / Pieces</p>
              <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{report.cratesPieces || '-'}</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Included employees</p>
            <p className="mt-1 text-sm text-zinc-700">{safeEntries.length} row{safeEntries.length === 1 ? '' : 's'} in this consolidated report</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/70 text-emerald-800">
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
              <tbody className="divide-y divide-zinc-200/70 bg-white/50">
                {safeEntries.map((entry, index) => (
                  <tr key={entryRowKey(entry, index)} className="text-zinc-700 hover:bg-emerald-50/40">
                    <td className="px-4 py-4 font-semibold text-zinc-900">{index + 1}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-900">{getEntryLabel(entry) || 'Untitled item'}</div>
                      <div className="text-xs text-zinc-400">{getEntryIdentifier(entry) || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-700">{resolveEntryDepartment(entry, report.department)}</td>
                    <td className="px-4 py-4 text-zinc-700">{getFieldValue(entry, 'thickness') || report.thickness || '-'}</td>
                    <td className="px-4 py-4 text-zinc-700">{getEntryPieces(entry) || report.cratesPieces || '-'}</td>
                    <td className="px-4 py-4 text-zinc-700">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatDate(entry.scannedAt || report.scannedAt)}</td>
                    <td className="px-4 py-4 font-semibold text-zinc-900">₱{Number(entry.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted by</p>
              <p className="mt-2 text-sm text-zinc-800">{report.submittedBy || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Date and time scanned</p>
              <p className="mt-2 text-sm text-zinc-800">{formatDate(report.scannedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Total crates / pieces</p>
              <p className="mt-2 text-sm text-zinc-800">{totalPieces}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Total amount</p>
              <p className="mt-2 text-sm font-semibold text-emerald-700">₱{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
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
      <PageHeader
        eyebrow="Production consolidated"
        title="Consolidated production report cards"
        description="Each card shows the day total. Opening a card reveals the full table for that report."
      />

      <Card className="space-y-4">
        {reportCards.length === 0 ? (
          <EmptyState title="No submitted reports yet" />
        ) : (
          <div className="space-y-3">
            {reportCards.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className={`group relative block w-full rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${selectedReportId === report.id ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-white hover:border-emerald-200'}`}
              >
                <div className="pr-12 md:flex md:items-center md:gap-5">
                  <div className="min-w-0 md:flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Consolidated report</p>
                    <h4 className="mt-1 truncate font-heading text-lg font-bold text-zinc-900">{report.department || 'Unknown Department'}</h4>
                    <p className="mt-1 text-sm text-zinc-500">{formatDate(report.scannedAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-0 md:w-[56%] md:grid-cols-3">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Employees</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{report.employeeCount}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Crates / Pieces</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{report.cratesPieces || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] font-semibold text-emerald-700/70">Total amount</p>
                      <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">₱{Number(report.totalAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 md:mt-0 md:min-w-[140px] md:flex-col md:items-end md:justify-center">
                    <span>{report.entries.length} row{report.entries.length === 1 ? '' : 's'}</span>
                    <span className="flex items-center gap-1 text-emerald-600 group-hover:text-emerald-700">Open report <ChevronRight className="h-3.5 w-3.5" /></span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReportId('')} />
    </div>
  )
}
