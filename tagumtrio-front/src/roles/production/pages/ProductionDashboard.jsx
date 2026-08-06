import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Search, X } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { fetchDailyReportsApi } from '../../../lib/api'
import { getEntryIdentifier, getEntryLabel, hasMeaningfulEntry } from '../../../shared/reports/report-entry-utils'
import { formatProductWithUnit } from '../../../lib/units'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Button, { LinkButton } from '../../../shared/ui/Button'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'

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

function resolveEntryDepartment(entry, fallbackDepartment) {
  return entry?.department
    || entry?.raw?.department
    || fallbackDepartment
    || '-'
}

function getReportPhotos(report) {
  const entries = Array.isArray(report?.entries) ? report.entries : []
  return entries.flatMap((entry) => {
    if (Array.isArray(entry?.photos)) return entry.photos
    if (entry?.photos && typeof entry.photos === 'object') return Object.values(entry.photos)
    return entry?.photoUrls || entry?.imageUrls || []
  }).filter(Boolean)
}

function isVerifiedReportStatus(status) {
  return String(status || '').trim().toLowerCase() === 'leadman_verified'
}

function buildReportCards(reports = []) {
  return (Array.isArray(reports) ? reports : []).map((report) => {
    const entries = Array.isArray(report.entries) ? report.entries.filter(hasMeaningfulEntry) : []
    const reportDate = report.reportDate || report.report_date || report.createdAt || report.created_at || new Date().toISOString()
    const firstEntry = entries[0] || {}
    const department = report.department || firstEntry.department || 'Unknown Department'
    const product = firstEntry.product || firstEntry.raw?.product || '-'
    const quantity = firstEntry.quantity || firstEntry.raw?.quantity || '-'
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
      product,
      quantity,
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
      <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl rounded-xl border border-zinc-200 bg-white shadow-sm max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted daily report</p>
            <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{report.department}</h3>
            <p className="mt-1 text-sm text-zinc-500">Submitted {formatReportDate(report.scannedAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
          

          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Quantity</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 bg-white/50">
                {report.entries.map((entry) => (
                  <tr key={entry.id || `${getEntryIdentifier(entry)}-${getEntryLabel(entry)}-${entry.scannedAt || ''}`} className="text-zinc-700 hover:bg-emerald-50/40">
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-900">{getEntryLabel(entry) || 'Untitled item'}</div>
                      <div className="text-xs text-zinc-400">{getEntryIdentifier(entry) || '-'}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-700">{resolveEntryDepartment(entry, report.department)}</td>
                    <td className="px-4 py-4 text-zinc-700">{(entry.product || entry.raw?.product || report.product) ? formatProductWithUnit(entry.product || entry.raw?.product || report.product, resolveEntryDepartment(entry, report.department)) : '-'}</td>
                    <td className="px-4 py-4 text-zinc-700">{entry.quantity || entry.raw?.quantity || report.quantity || '-'}</td>
                    <td className="px-4 py-4 text-zinc-700">{formatReportDate(entry.scannedAt || report.scannedAt)}</td>
                    <td className="px-4 py-4 font-semibold text-zinc-900">₱{Number(entry.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Images</p>
              <p className="mt-2 text-sm text-zinc-800">{report.photos?.length || 0} photo{report.photos?.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-end justify-end">
              {report.photos?.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onPreviewPhotos?.(report.photos)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-white"
                >
                  Preview images
                </button>
              ) : (
                <p className="text-sm text-zinc-400">No images submitted</p>
              )}
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted by</p>
              <p className="mt-2 text-sm text-zinc-800">{report.submittedBy || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Date and time scanned</p>
              <p className="mt-2 text-sm text-zinc-800">{formatReportDate(report.scannedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Total employees involved</p>
              <p className="mt-2 text-sm text-zinc-800">{report.employeeCount}</p>
            </div><div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Verification</p>
              <Badge className="mt-2" variant={report.isVerified ? 'success' : 'danger'}>{report.verificationLabel}</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:justify-end sm:items-center">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onCompile(report)}
            disabled={!report.isVerified || compilingReportId === report.id}
          >
            {compilingReportId === report.id ? 'Compiling...' : report.isVerified ? 'Compile' : 'Cannot compile until verified'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ProductionDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const dialog = useDialog()
  const { updateDailyReportStatus } = useAppData()
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
  const [activeTab, setActiveTab] = useState('pending')

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
        report.product,
        report.quantity,
        report.scannedAt,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(query))
    })
  }, [reportCards, searchText, selectedDate, selectedDepartment])

  const pendingReports = useMemo(
    () => filteredReports.filter((report) => String(report.status || '').trim().toLowerCase() === 'submitted'),
    [filteredReports]
  )
  const verifiedReports = useMemo(
    () => filteredReports.filter((report) => isVerifiedReportStatus(report.status)),
    [filteredReports]
  )
  const visibleReports = activeTab === 'verified' ? verifiedReports : pendingReports

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
      <PageHeader
        tone="brand"
        title="Daily Production Reports"
        description="Read and review submitted reports from leadman and the employee workflow."
        actions={user?.role === 'production_incharge' ? (
          <LinkButton to="/app/production/compiled" variant="secondary">
            View compiled reports
          </LinkButton>
        ) : null}
      />

      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search department, product, or submitted by..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300/40"
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300/40"
            >
              {departments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300/40"
            />
          </div>
        </div>

        <div className="flex gap-2 border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Pending ({pendingReports.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('verified')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'verified' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
          >
            Verified ({verifiedReports.length})
          </button>
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        {loading ? <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading submitted reports...</div> : null}
        {!loading && visibleReports.length === 0 ? (
          <EmptyState title={activeTab === 'verified' ? 'No verified reports yet' : 'No pending reports'} />
        ) : null}

        {!loading && visibleReports.length > 0 ? (
          <motion.div
            className="space-y-3"
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          >
            {visibleReports.map((report) => (
              <motion.div
                key={report.id}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
              >
              <button
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className="group relative block w-full rounded-lg border border-zinc-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
              >
                <div className="pr-12 md:flex md:items-center md:gap-5">
                  <div className="min-w-0 md:flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Submitted report</p>
                    <h4 className="mt-1 truncate font-heading text-lg font-bold text-zinc-900">{report.department || 'Unknown Department'}</h4>
                    <p className="mt-1 text-sm text-zinc-500">{formatReportDate(report.scannedAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-4 md:mt-0 md:w-[56%] md:grid-cols-4">
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Employees</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{report.employeeCount}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Product</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{report.product ? formatProductWithUnit(report.product, report.department) : '-'}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Quantity</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{report.quantity || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                      <p className="text-[11px] text-zinc-400">Status</p>
                      <Badge variant={report.isVerified ? 'success' : 'danger'} className="mt-1">
                        {report.verificationLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 md:mt-0 md:min-w-[140px] md:flex-col md:items-end md:justify-center">
                    <span>{report.entries.length} row{report.entries.length === 1 ? '' : 's'}</span>
                    <span className="flex items-center gap-1 text-emerald-600 group-hover:text-emerald-700">Open report <ChevronRight className="h-3.5 w-3.5" /></span>
                  </div>
                </div>
              </button>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </Card>

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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
                <h3 className="font-heading text-lg font-bold text-zinc-900">Report images</h3>
                <button
                  type="button"
                  onClick={() => setShowPhotosModal(false)}
                  className="text-zinc-500 hover:text-zinc-900"
                >
                  Close
                </button>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {selectedPhotos.map((photo, index) => (
                  <div key={`${photo}-${index}`} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                    <img src={photo} alt={`Report image ${index + 1}`} className="h-64 w-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
