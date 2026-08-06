import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, Image as ImageIcon } from 'lucide-react'
import { useAppData } from '../../../context/app-data-context'
import PageHeader from '../../../shared/ui/PageHeader'
import Badge from '../../../shared/ui/Badge'
import EmptyState from '../../../shared/ui/EmptyState'

function toDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function extractEntries(report) {
  return Array.isArray(report?.entries) ? report.entries : []
}

function getReportPhotos(report) {
  return extractEntries(report).flatMap((entry) => {
    if (Array.isArray(entry?.photos)) return entry.photos
    if (entry?.photos && typeof entry.photos === 'object') return Object.values(entry.photos)
    return entry?.photoUrls || entry?.imageUrls || []
  }).filter(Boolean)
}

function getStatusLabel(status) {
  switch (normalizeText(status)) {
    case 'submitted':
      return 'Awaiting leadman verification'
    case 'leadman_verified':
      return 'Leadman verified — ready to compile'
    case 'compiled':
      return 'Compiled'
    case 'gm_submitted':
      return 'Sent to GM'
    case 'approved':
      return 'Approved — payroll released'
    case 'rejected':
      return 'Rejected'
    default:
      return status || 'Unknown'
  }
}

function getStatusVariant(status) {
  switch (normalizeText(status)) {
    case 'submitted':
      return 'warning'
    case 'leadman_verified':
    case 'compiled':
    case 'approved':
      return 'success'
    case 'gm_submitted':
      return 'info'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export default function ProductionReports() {
  const { dailyReports = [], formatDateTime: formatProviderDateTime } = useAppData()

  const [activeTab, setActiveTab] = useState('pending')
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState([])
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const departments = useMemo(() => {
    const list = Array.isArray(dailyReports) ? dailyReports : []
    return ['All Departments', ...Array.from(new Set(list.map((report) => report.department).filter(Boolean))).sort()]
  }, [dailyReports])

  const statusOptions = useMemo(() => {
    const list = Array.isArray(dailyReports) ? dailyReports : []
    return Array.from(new Set(list.map((report) => normalizeText(report.status)).filter(Boolean)))
  }, [dailyReports])

  const filteredDailyReports = useMemo(() => {
    const list = Array.isArray(dailyReports) ? dailyReports : []
    return list.filter((report) => {
      const matchesDepartment = selectedDepartment === 'All Departments' || report.department === selectedDepartment
      const matchesDate = !selectedDate || toDateKey(report.reportDate || report.report_date || report.createdAt || report.created_at) === selectedDate
      const matchesStatus = selectedStatus === 'all' || normalizeText(report.status) === selectedStatus
      return matchesDepartment && matchesDate && matchesStatus
    })
  }, [dailyReports, selectedDepartment, selectedDate, selectedStatus])

  const pendingReports = useMemo(
    () => filteredDailyReports.filter((report) => normalizeText(report.status) === 'submitted'),
    [filteredDailyReports]
  )

  const reviewedReports = useMemo(
    () => filteredDailyReports.filter((report) => normalizeText(report.status) === 'leadman_verified'),
    [filteredDailyReports]
  )

  const ReportCard = ({ report }) => {
    const isExpanded = expandedReportId === report.id
    const entries = extractEntries(report)
    const photos = getReportPhotos(report)

    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 transition-colors hover:border-zinc-300">
        <button
          type="button"
          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-white/70"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold text-zinc-900">{report.department || 'Unknown Department'} • {report.reportDate || report.report_date || 'No date'}</h3>
              <Badge variant={getStatusVariant(report.status)}>{getStatusLabel(report.status)}</Badge>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Submitted by {report.submittedByName || report.submitted_by_name || 'Unknown'} • {formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {entries.length} entr{entries.length === 1 ? 'y' : 'ies'} • {report.summary || 'No summary provided'}
              {report.targetDepartment ? <> • Heading to {report.targetDepartment}</> : null}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 shrink-0 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded ? (
          <div className="border-t border-zinc-200 bg-white/40 p-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Department</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{report.department || '—'}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Status</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{getStatusLabel(report.status)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Entries</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{entries.length}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Created</p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{formatProviderDateTime ? formatProviderDateTime(report.createdAt || report.created_at || report.reportDate) : formatDateTime(report.createdAt || report.created_at || report.reportDate)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">Report notes</p>
              <p className="mt-2 text-sm text-zinc-800">{report.summary || 'No summary provided.'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Images</p>
                <p className="mt-2 text-sm text-zinc-800">{photos.length || 0} photo{photos.length === 1 ? '' : 's'}</p>
              </div>
              <div className="sm:col-span-3">
                {photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPhotos(photos)
                      setShowPhotoModal(true)
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-white"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Preview images
                  </button>
                ) : (
                  <p className="mt-2 text-sm text-zinc-400">No images available</p>
                )}
              </div>
            </div>

            {normalizeText(report.status) === 'submitted' ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                Awaiting verification by {report.targetDepartment || 'the next department'}'s leadman. This view is read-only for production in-charge — once verified, it'll be ready to compile from the Production Dashboard.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader tone="brand" eyebrow="Production in-charge" title="Production Reports" description="Read-only monitoring of reports as they move through leadman verification." />

      <div className="grid gap-3 sm:grid-cols-3 sm:max-w-2xl">
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
        <select
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300/40"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>{getStatusLabel(status)}</option>
          ))}
        </select>
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
          onClick={() => setActiveTab('reviewed')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'reviewed' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          Verified ({reviewedReports.length})
        </button>
      </div>

      <motion.div
        className="space-y-3"
        initial="hidden" animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {activeTab === 'pending' ? (
          pendingReports.length === 0 ? (
            <EmptyState title="No pending reports" description="No submitted reports waiting on leadman verification." />
          ) : (
            pendingReports.map((report) => (
              <motion.div key={report.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}>
                <ReportCard report={report} />
              </motion.div>
            ))
          )
        ) : reviewedReports.length === 0 ? (
          <EmptyState title="No verified reports yet" />
        ) : (
          reviewedReports.map((report) => (
            <motion.div key={report.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}>
              <ReportCard report={report} />
            </motion.div>
          ))
        )}
      </motion.div>

      {showPhotoModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4">
          <div className="flex min-h-full items-center justify-center py-8">
            <div className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
                <h3 className="font-heading text-lg font-bold text-zinc-900">Verification photos</h3>
                <button type="button" onClick={() => setShowPhotoModal(false)} className="text-zinc-500 hover:text-zinc-900">Close</button>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
                {selectedPhotos.map((photo, index) => (
                  <div key={index} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    <img src={photo} alt={`Report ${index + 1}`} className="h-40 w-full object-cover" />
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
