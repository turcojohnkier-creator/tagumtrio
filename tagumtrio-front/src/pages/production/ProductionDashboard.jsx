import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Filter, Search, X } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { useQr } from '../../context/qr-context'
import { fetchDailyReportsApi } from '../../lib/api'
import { getEntryIdentifier, getEntryLabel, getEntryPieces, hasMeaningfulEntry } from '../../shared/reports/report-entry-utils'

function formatReportDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function toDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
  return date.toISOString().slice(0, 10)
}

function getFieldValue(entry, key) {
  return entry?.raw?.qrFields?.[key] ?? entry?.qrFields?.[key] ?? entry?.[key] ?? ''
}

function resolveEntryDepartment(entry, fallbackDepartment) {
  return entry?.department
    || entry?.raw?.department
    || entry?.raw?.qrFields?.department
    || entry?.qrFields?.department
    || fallbackDepartment
    || '-'
}

function getReportPhotos(report) {
  const entries = Array.isArray(report?.entries) ? report.entries : []
  return entries.flatMap((entry) => entry?.photos || entry?.photoUrls || entry?.imageUrls || []).filter(Boolean)
}

function isVerifiedReportStatus(status) {
  const normalized = String(status || '').trim().toLowerCase()
  return ['production_verified', 'leadman_verified', 'gm_submitted', 'compiled', 'verified'].includes(normalized)
}

function buildReportCards(reports = []) {
  return (Array.isArray(reports) ? reports : []).map((report) => {
    const entries = Array.isArray(report.entries) ? report.entries.filter(hasMeaningfulEntry) : []
    const reportDate = report.reportDate || report.report_date || report.createdAt || report.created_at || new Date().toISOString()
    const firstEntry = entries[0] || {}
    const department = report.department || firstEntry.department || 'Unknown Department'
    const thickness = firstEntry.raw?.qrFields?.thickness || firstEntry.qrFields?.thickness || firstEntry.thickness || '-'
    const cratesPieces = firstEntry.raw?.qrFields?.cratePieces
      || firstEntry.qrFields?.cratePieces
      || firstEntry.raw?.qrFields?.crates
      || firstEntry.qrFields?.crates
      || firstEntry.raw?.qrFields?.pieces
      || firstEntry.qrFields?.pieces
      || firstEntry.cratePieces
      || firstEntry.crates
      || firstEntry.pieces
      || '-'
    const scannedAt = report.createdAt || report.created_at || reportDate
    const employeeCount = new Set(entries.map((entry) => String(getEntryIdentifier(entry) || getEntryLabel(entry) || entry.id || ''))).size
    const photos = getReportPhotos(report)
    const isVerified = isVerifiedReportStatus(report.status)
    const verificationLabel = isVerified ? 'Verified' : 'Not verified'

    return {
      id: report.id,
      department,
      reportDate,
      scannedAt,
      employeeCount,
      thickness,
      cratesPieces,
      entries,
      photos,
      status: report.status || '',
      isVerified,
      verificationLabel,
      summary: report.summary || '',
      submittedBy: report.submittedByName || report.submitted_by_name || report.submittedBy || report.submitted_by || 'Unknown',
      totalAmount: entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    }
  }).sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0))
}

function ReportDetailModal({ report, onClose, onPreviewPhotos, onCompile, compilingReportId }) {
  if (!report) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Submitted daily report</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{report.department}</h3>
            <p className="mt-1 text-sm text-slate-400">Submitted {formatReportDate(report.scannedAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
          

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Thickness</th>
                  <th className="px-4 py-3 font-medium">Crates / Pieces</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
                {report.entries.map((entry) => (
                  <tr key={entry.id || `${getEntryIdentifier(entry)}-${getEntryLabel(entry)}-${entry.scannedAt || ''}`} className="text-slate-300 hover:bg-slate-900/80">
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{getEntryLabel(entry) || 'Untitled item'}</div>
                      <div className="text-xs text-slate-500">{getEntryIdentifier(entry) || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{resolveEntryDepartment(entry, report.department)}</td>
                    <td className="px-4 py-4 text-slate-300">{getFieldValue(entry, 'thickness') || report.thickness || '-'}</td>
                    <td className="px-4 py-4 text-slate-300">{getEntryPieces(entry) || report.cratesPieces || '-'}</td>
                    <td className="px-4 py-4 text-slate-300">{getFieldValue(entry, 'date') || getFieldValue(entry, 'dateIn') || formatReportDate(entry.scannedAt || report.scannedAt)}</td>
                    <td className="px-4 py-4 font-semibold text-white">₱{Number(entry.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Images</p>
              <p className="mt-2 text-sm text-slate-200">{report.photos?.length || 0} photo{report.photos?.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-end justify-end">
              {report.photos?.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onPreviewPhotos?.(report.photos)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-slate-600 hover:bg-slate-900"
                >
                  Preview images
                </button>
              ) : (
                <p className="text-sm text-slate-500">No images submitted</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submitted by</p>
              <p className="mt-2 text-sm text-slate-200">{report.submittedBy || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date and time scanned</p>
              <p className="mt-2 text-sm text-slate-200">{formatReportDate(report.scannedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total employees involved</p>
              <p className="mt-2 text-sm text-slate-200">{report.employeeCount}</p>
            </div><div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Verification</p>
              <p className={`mt-2 text-sm ${report.isVerified ? 'text-emerald-300' : 'text-rose-300'}`}>{report.verificationLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end sm:items-center">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCompile(report)}
            disabled={!report.isVerified || compilingReportId === report.id}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {compilingReportId === report.id ? 'Compiling...' : report.isVerified ? 'Compile' : 'Cannot compile until verified'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProductionDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dialog = useDialog()
  const { updateDailyReportStatus } = useQr()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedReportId, setSelectedReportId] = useState('')
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  const [compilingReportId, setCompilingReportId] = useState('')

  if (user?.role === 'gm') {
    return <Navigate to="/app/production/consolidated" replace />
  }

  async function loadReports(mountedRef = { current: true }) {
    setLoading(true)
    setError('')
    try {
      const remoteReports = await fetchDailyReportsApi()
      if (mountedRef.current) {
        setReports(Array.isArray(remoteReports) ? remoteReports : [])
      }
    } catch (loadError) {
      if (mountedRef.current) {
        setError(loadError?.message || 'Failed to load submitted reports.')
        setReports([])
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    const mountedRef = { current: true }
    loadReports(mountedRef)
    return () => {
      mountedRef.current = false
    }
  }, [])

  async function handleCompile(report) {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: 'Compile report',
      message: `Move report ${report.id} into compiled reports and send it for GM review?`,
      confirmText: 'Compile',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    setCompilingReportId(report.id)
    try {
      await updateDailyReportStatus(report.id, {
        status: 'compiled',
        verifiedBy: user?.id,
        verifiedByName: user?.name || user?.fullName || user?.username,
      })
      await loadReports()
      dialog.success({
        title: 'Compiled successfully',
        message: 'The report has been moved to compiled reports and is ready for submission to GM.',
      })
      setSelectedReportId('')
      navigate('/app/production/compiled')
    } catch (compileError) {
      dialog.error({
        title: 'Compile failed',
        message: compileError?.message || 'Unable to compile the report at this time.',
      })
    } finally {
      setCompilingReportId('')
    }
  }

  const reportCards = useMemo(() => buildReportCards(reports), [reports])
  const departments = useMemo(() => {
    return ['All Departments', ...Array.from(new Set(reportCards.map((report) => report.department).filter(Boolean))).sort()]
  }, [reportCards])
  const filteredReports = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return reportCards.filter((report) => {
      const matchesDepartment = selectedDepartment === 'All Departments' || report.department === selectedDepartment
      const matchesDate = !selectedDate || toDateKey(report.scannedAt || report.reportDate) === selectedDate

      if (!matchesDepartment || !matchesDate) return false

      if (!query) return true

      return [
        report.id,
        report.department,
        report.submittedBy,
        report.summary,
        report.thickness,
        report.cratesPieces,
        report.scannedAt,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    })
  }, [reportCards, searchText, selectedDate, selectedDepartment])

  const selectedReport = useMemo(() => filteredReports.find((report) => report.id === selectedReportId) || null, [filteredReports, selectedReportId])

  const totals = useMemo(() => {
    return filteredReports.reduce((accumulator, report) => {
      accumulator.reports += 1
      accumulator.employees += report.employeeCount
      return accumulator
    }, { reports: 0, employees: 0 })
  }, [filteredReports])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Daily Production Reports</h2>
          <p className="mt-1 text-slate-400">Read and review submitted reports from leadman and the employee workflow.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {user?.role === 'production_incharge' ? (
            <Link
              to="/app/production/compiled"
              className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900"
            >
              View compiled reports
            </Link>
          ) : null}
          
        </div>
      </div>



      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search department, thickness, or submitted by..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
            >
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40"
            />
          </div>
        </div>

        {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div> : null}
        {loading ? <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">Loading submitted reports...</div> : null}
        {!loading && filteredReports.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">No submitted reports yet.</div>
        ) : null}

        {!loading && filteredReports.length > 0 ? (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className="group relative block w-full rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition-all hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="pr-12 md:flex md:items-center md:gap-5">
                  <div className="min-w-0 md:flex-1">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Submitted report</p>
                    <h4 className="mt-1 truncate text-lg font-semibold text-white">{report.department || 'Unknown Department'}</h4>
                    <p className="mt-1 text-sm text-slate-400">{formatReportDate(report.scannedAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4 md:mt-0 md:w-[56%] md:grid-cols-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Employees</p>
                      <p className="mt-1 text-sm font-semibold text-white">{report.employeeCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Thickness</p>
                      <p className="mt-1 text-sm font-semibold text-white">{report.thickness || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Crates / Pieces</p>
                      <p className="mt-1 text-sm font-semibold text-white">{report.cratesPieces || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Status</p>
                      <p className={`mt-1 text-sm font-semibold ${report.isVerified ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {report.verificationLabel}
                      </p>
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
        ) : null}
      </div>

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReportId('')}
        onPreviewPhotos={(photos) => {
          setSelectedPhotos(Array.isArray(photos) ? photos : [])
          setShowPhotosModal(true)
        }}
        onCompile={handleCompile}
        compilingReportId={compilingReportId}
      />

      {showPhotosModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl overflow-auto rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Report images</h3>
              <button
                type="button"
                onClick={() => setShowPhotosModal(false)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedPhotos.map((photo, index) => (
                <div key={`${photo}-${index}`} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
                  <img src={photo} alt={`Report image ${index + 1}`} className="h-64 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
