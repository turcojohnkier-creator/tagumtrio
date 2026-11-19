import { useEffect, useMemo, useState } from 'react'
import { X, ZoomIn, Briefcase, CalendarDays, CalendarCheck, ClipboardList } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppData } from '../../context/app-data-context'
import { formatEmployeeId } from '../../lib/employeeId'
import { formatRole } from '../../lib/roles'
import { fetchDailyReportsApi, resolveAvatarUrl } from '../../lib/api'
import { formatDateKey, toManilaDateKey } from '../../lib/datetime'
import { getEntryDate, getEntryPieces } from '../reports/report-entry-utils'
import { getStatusLabel, getStatusVariant, normalizeStatus } from '../reports/report-status'
import { daysUntilPurge } from '../../lib/archive'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Portal from '../ui/Portal'
import Avatar from '../ui/Avatar'

const RECENT_WORK_LIMIT = 5
const RECENT_LEAVE_LIMIT = 3
// Reports in these states never become pay, so they don't count as work.
const EXCLUDED_REPORT_STATUSES = new Set(['rejected'])

const LEAVE_VARIANTS = { approved: 'success', pending: 'warning', rejected: 'danger' }

function formatDate(value) {
  if (!value) return '—'
  const key = toManilaDateKey(value)
  return key ? formatDateKey(key) : '—'
}

function formatShortDate(key) {
  return key ? formatDateKey(key, 'short') : '—'
}

function formatPeso(value) {
  return `₱${Number(value || 0).toLocaleString()}`
}

function titleCase(value) {
  return String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function InfoItem({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-zinc-900 break-words">{children}</dd>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {Icon ? <Icon className="h-4 w-4 text-emerald-600" /> : null}
        {title}
      </h4>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function StatTile({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div className="mt-1 text-lg font-bold tabular-nums text-zinc-900">{value}</div>
    </div>
  )
}

// Shared account profile. Opened from any list of people for every role except
// employees (see ProfileViewerProvider). `onToggleActive` adds the HR-only
// archive/reactivate action.
export default function EmployeeProfileModal({ employee, onClose, onToggleActive, actionLoading = false }) {
  const { dailyReports: contextReports = [], getEmployeeLeaveRequests } = useAppData()
  const [previewOpen, setPreviewOpen] = useState(false)
  // Pages narrow the shared report list (by department/date) and GM never loads
  // it, so the profile fetches its own copy, tagged with whose profile it was for.
  const [fetched, setFetched] = useState({ forId: null, reports: [] })

  const id = employee ? (employee.employeeId ?? employee.id ?? employee.employee_id ?? '') : ''
  const avatarUrl = resolveAvatarUrl(employee?.avatar_url)
  const isEmployeeRole = String(employee?.role || '').toLowerCase() === 'employee'

  useEffect(() => {
    if (!isEmployeeRole || id === '') return undefined
    let cancelled = false
    const done = (reports) => { if (!cancelled) setFetched({ forId: id, reports: Array.isArray(reports) ? reports : [] }) }
    fetchDailyReportsApi().then(done).catch(() => done([]))
    return () => { cancelled = true }
  }, [id, isEmployeeRole])

  const workLoading = isEmployeeRole && String(fetched.forId) !== String(id)
  const dailyReports = fetched.reports.length > 0 ? fetched.reports : contextReports

  // Every report row this person appears in, newest work date first.
  const workRecords = useMemo(() => {
    if (!isEmployeeRole || id === '' || workLoading) return []
    const records = []
    for (const report of Array.isArray(dailyReports) ? dailyReports : []) {
      const status = normalizeStatus(report.status)
      if (EXCLUDED_REPORT_STATUSES.has(status)) continue
      const reportDate = report.reportDate || report.report_date || report.createdAt || ''
      ;(Array.isArray(report.entries) ? report.entries : []).forEach((entry, index) => {
        const entryEmployeeId = entry?.employeeId ?? entry?.raw?.employeeId ?? entry?.raw?.employee_id
        if (String(entryEmployeeId) !== String(id)) return
        records.push({
          key: entry.id || `${report.id}-${index}`,
          dateKey: getEntryDate(entry, String(reportDate).slice(0, 10)),
          department: entry.department || report.department || '—',
          product: entry.product || entry.raw?.product || '',
          pieces: getEntryPieces(entry),
          amount: Number(entry.amount || 0),
          status,
        })
      })
    }
    return records.sort((a, b) => String(b.dateKey).localeCompare(String(a.dateKey)))
  }, [dailyReports, id, isEmployeeRole, workLoading])

  const workStats = useMemo(() => ({
    daysWorked: new Set(workRecords.map((record) => record.dateKey).filter(Boolean)).size,
    entries: workRecords.length,
    approvedEarnings: workRecords
      .filter((record) => record.status === 'approved')
      .reduce((sum, record) => sum + record.amount, 0),
  }), [workRecords])

  const leaveRequests = useMemo(
    () => (isEmployeeRole && id !== '' && getEmployeeLeaveRequests ? getEmployeeLeaveRequests(id) : []),
    [getEmployeeLeaveRequests, id, isEmployeeRole]
  )

  const leaveCounts = useMemo(() => leaveRequests.reduce((counts, request) => {
    const status = normalizeStatus(request.status)
    counts[status] = (counts[status] || 0) + 1
    return counts
  }, {}), [leaveRequests])

  // Esc closes the picture preview first, then the profile itself. Captured and
  // stopped so a modal underneath (report, team list) doesn't close too.
  useEffect(() => {
    if (!employee) return undefined
    function handleKeyDown(event) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      if (previewOpen) setPreviewOpen(false)
      else onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [employee, previewOpen, onClose])

  if (!employee) return null

  const name = employee.employeeName || employee.name || employee.employee_name || 'Unknown'
  const username = employee.identifier || ''
  const role = employee.role ? formatRole(employee.role) : '—'
  const isActive = employee.is_active !== false
  const departments = Array.isArray(employee.departments) && employee.departments.length > 0
    ? employee.departments
    : (employee.department ? [employee.department] : [])
  const createdAt = employee.created_at || employee.createdAt
  const archivedAt = employee.archived_at || employee.archivedAt
  const daysLeft = !isActive ? daysUntilPurge(archivedAt) : null
  const toggleLabel = isActive ? 'Archive account' : 'Reactivate account'

  const avatar = (
    <Avatar
      name={name}
      src={employee.avatar_url}
      size="h-28 w-28 sm:h-32 sm:w-32 text-4xl"
      className="bg-emerald-100 text-emerald-800 ring-4 ring-white shadow-md"
    />
  )

  return (
    <Portal>
      {/* Above every page/report popup (≤ z-95), below app dialogs (z-100). */}
      <div className="fixed inset-0 z-[96] overflow-y-auto p-4">
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <div className="relative flex min-h-full items-center justify-center">
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${name}'s profile`}
            className="relative mx-auto w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 shadow-xl"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {/* Cover band */}
            <div className="relative h-28 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 sm:h-32">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="btn-dismiss absolute right-3 top-3 rounded-lg bg-black/20 p-2 text-white hover:bg-black/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Identity */}
            <div className="px-5 pb-5 sm:px-6">
              {/* Only the picture overlaps the cover band; the name always sits below it. */}
              <div className="flex flex-col items-center gap-x-5 gap-y-3 text-center sm:flex-row sm:items-start sm:text-left">
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    aria-label="View profile picture"
                    className="group relative z-10 -mt-14 shrink-0 cursor-zoom-in rounded-full sm:-mt-16 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
                  >
                    {avatar}
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ZoomIn className="h-7 w-7 text-white" />
                    </span>
                  </button>
                ) : (
                  <div className="relative z-10 -mt-14 shrink-0 sm:-mt-16">{avatar}</div>
                )}

                <div className="min-w-0 flex-1 sm:pt-3">
                  <h3 className="font-heading text-2xl font-bold text-zinc-900 break-words">{name}</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {formatEmployeeId(id)}
                    {username ? <span> · @{username}</span> : null}
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge variant="info">{role}</Badge>
                    <Badge variant={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : 'Archived'}</Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
              <SectionCard title="Account information" icon={Briefcase}>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <InfoItem label="Full name">{name}</InfoItem>
                  <InfoItem label="Username">{username || '—'}</InfoItem>
                  <InfoItem label="Employee ID">{formatEmployeeId(id)}</InfoItem>
                  <InfoItem label="Role">{role}</InfoItem>
                  <InfoItem label={departments.length > 1 ? 'Departments' : 'Department'}>
                    {departments.length === 0 ? (
                      <span className="text-zinc-500">Unassigned</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {departments.map((department) => (
                          <span key={department} className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            {department}
                          </span>
                        ))}
                      </span>
                    )}
                  </InfoItem>
                  <InfoItem label="Status">{isActive ? 'Active' : 'Archived'}</InfoItem>
                  <InfoItem label="Account created">{formatDate(createdAt)}</InfoItem>
                  {!isActive ? (
                    <InfoItem label="Archived on">
                      {formatDate(archivedAt)}
                      {daysLeft !== null ? (
                        <span className="mt-1 block text-xs font-normal text-zinc-500">
                          {daysLeft === 0 ? 'Permanently deleted today' : `Permanently deleted in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                        </span>
                      ) : null}
                    </InfoItem>
                  ) : null}
                </dl>
              </SectionCard>

              {isEmployeeRole ? (
                <>
                  <SectionCard title="Work summary" icon={ClipboardList}>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <StatTile label="Days worked" value={workStats.daysWorked} />
                      <StatTile label="Report entries" value={workStats.entries} />
                      <StatTile label="Approved earnings" value={formatPeso(workStats.approvedEarnings)} />
                    </div>

                    <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-zinc-400">Recent work</p>
                    {workLoading ? (
                      <p className="mt-2 text-sm text-zinc-500">Loading work history…</p>
                    ) : workRecords.length === 0 ? (
                      <p className="mt-2 text-sm text-zinc-500">No work recorded in daily reports yet.</p>
                    ) : (
                      <ul className="mt-2 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                        {workRecords.slice(0, RECENT_WORK_LIMIT).map((record) => (
                          <li key={record.key} className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
                                {formatShortDate(record.dateKey)}
                                <span className="font-normal text-zinc-500">· {record.department}</span>
                              </div>
                              <div className="mt-0.5 text-xs text-zinc-500">
                                {[record.product, record.pieces !== '' ? `${record.pieces} pcs` : ''].filter(Boolean).join(' · ') || '—'}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:justify-end">
                              <Badge variant={getStatusVariant(record.status)} className="text-[11px]">{getStatusLabel(record.status)}</Badge>
                              <span className="text-sm font-semibold tabular-nums text-emerald-700">{formatPeso(record.amount)}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard title="Leave requests" icon={CalendarCheck}>
                    <div className="grid grid-cols-3 gap-3">
                      <StatTile label="Pending" value={leaveCounts.pending || 0} />
                      <StatTile label="Approved" value={leaveCounts.approved || 0} />
                      <StatTile label="Rejected" value={leaveCounts.rejected || 0} />
                    </div>
                    {leaveRequests.length === 0 ? (
                      <p className="mt-4 text-sm text-zinc-500">No leave requests filed.</p>
                    ) : (
                      <ul className="mt-4 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                        {leaveRequests.slice(0, RECENT_LEAVE_LIMIT).map((request) => {
                          const status = normalizeStatus(request.status)
                          const start = request.startDate ? String(request.startDate).slice(0, 10) : ''
                          const end = request.endDate ? String(request.endDate).slice(0, 10) : ''
                          const range = start && end && end !== start
                            ? `${formatShortDate(start)} – ${formatShortDate(end)}`
                            : formatShortDate(start)
                          return (
                            <li key={request.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-zinc-900">{titleCase(request.leaveType) || 'Leave'}</div>
                                <div className="mt-0.5 text-xs text-zinc-500">{range}</div>
                              </div>
                              <Badge variant={LEAVE_VARIANTS[status] || 'neutral'}>{titleCase(status) || 'Unknown'}</Badge>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </SectionCard>
                </>
              ) : null}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={onClose} className="btn-dismiss">Close</Button>
                {onToggleActive ? (
                  <Button onClick={() => onToggleActive(employee)} disabled={actionLoading}>
                    {actionLoading ? 'Updating...' : toggleLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Profile picture preview */}
      <AnimatePresence>
        {previewOpen && avatarUrl ? (
          <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPreviewOpen(false)}
            />
            <motion.figure
              role="dialog"
              aria-modal="true"
              aria-label={`${name}'s profile picture`}
              className="relative z-10 flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
                className="btn-dismiss absolute -right-2 -top-12 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={avatarUrl}
                alt={`${name}'s profile picture`}
                className="aspect-square w-[min(80vw,384px)] rounded-2xl object-cover shadow-2xl ring-1 ring-white/20"
              />
              <figcaption className="mt-3 text-center text-sm font-medium text-white">{name}</figcaption>
            </motion.figure>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  )
}
