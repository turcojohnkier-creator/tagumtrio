import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import { fetchDailyReportsApi } from '../../../lib/api'
import { groupReportsIntoBundles } from '../../../shared/reports/report-bundle-utils'
import { normalizeStatus, getStatusLabel } from '../../../shared/reports/report-status'
import ReportBundleCard from '../../../shared/reports/ReportBundleCard'
import ReportBundleModal from '../../../shared/reports/ReportBundleModal'
import ReportDetailModal from '../../../shared/reports/ReportDetailModal'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import EmptyState from '../../../shared/ui/EmptyState'

function toDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

export default function ProductionConsolidatedReports() {
  const { user } = useAuth()
  const { approveDailyReport, markNotificationsSeen } = useAppData()
  const dialog = useDialog()
  const [reports, setReports] = useState([])

  useEffect(() => {
    markNotificationsSeen('daily_report_gm_pending')
  }, [])
  const [activeTab, setActiveTab] = useState('all')
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [approvingKey, setApprovingKey] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  function loadReports() {
    return fetchDailyReportsApi()
      .then((result) => setReports(Array.isArray(result) ? result : []))
      .catch(() => setReports([]))
  }

  useEffect(() => {
    loadReports()
  }, [])

  const allBundles = useMemo(() => groupReportsIntoBundles(reports), [reports])

  const departments = useMemo(() => {
    return ['All Departments', ...Array.from(new Set(allBundles.map((bundle) => bundle.department).filter(Boolean))).sort()]
  }, [allBundles])

  const statusOptions = useMemo(() => {
    return Array.from(new Set(allBundles.map((bundle) => normalizeStatus(bundle.status)).filter(Boolean)))
  }, [allBundles])

  const bundles = useMemo(() => {
    return allBundles.filter((bundle) => {
      const matchesDepartment = selectedDepartment === 'All Departments' || bundle.department === selectedDepartment
      const matchesDate = !selectedDate || toDateKey(bundle.reportDate) === selectedDate || bundle.reportDate === selectedDate
      const matchesStatus = selectedStatus === 'all' || normalizeStatus(bundle.status) === selectedStatus
      return matchesDepartment && matchesDate && matchesStatus
    })
  }, [allBundles, selectedDepartment, selectedDate, selectedStatus])

  const pendingApprovalBundles = useMemo(() => bundles.filter((bundle) => normalizeStatus(bundle.status) === 'gm_submitted'), [bundles])
  const visibleBundles = activeTab === 'pending' ? pendingApprovalBundles : bundles
  const selectedBundle = useMemo(() => visibleBundles.find((bundle) => bundle.key === selectedBundleKey) || null, [visibleBundles, selectedBundleKey])

  const isGm = user?.role === 'gm'

  async function handleApproveBundle(bundle) {
    if (!bundle) return

    const confirmed = await dialog.confirm({
      title: 'Approve this bundle?',
      message: `Approving releases payroll for every employee across all ${bundle.reportCount} report${bundle.reportCount === 1 ? '' : 's'} in this bundle.`,
      confirmText: 'Approve & release payroll',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setApprovingKey(bundle.key)
    try {
      await Promise.all(bundle.reports.map((report) => approveDailyReport(report.id)))
      await loadReports()
      setSelectedBundleKey('')
      dialog.success({
        title: 'Bundle approved',
        message: 'The bundle has been approved and payroll has been released.',
      })
    } catch (error) {
      dialog.error({
        title: 'Approval failed',
        message: error?.message || 'Unable to approve this bundle.',
      })
    } finally {
      setApprovingKey('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Production consolidated"
        title="Consolidated production report cards"
        description="Each card bundles a department's reports for one day. Opening a bundle reveals the individual reports inside it."
      />

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
          onClick={() => setActiveTab('all')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          All Reports ({bundles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          Pending Approval ({pendingApprovalBundles.length})
        </button>
      </div>

      <Card className="space-y-4">
        {visibleBundles.length === 0 ? (
          <EmptyState title={activeTab === 'pending' ? 'No reports awaiting approval' : 'No submitted reports yet'} />
        ) : (
          <div className="space-y-3">
            {visibleBundles.map((bundle) => (
              <ReportBundleCard
                key={bundle.key}
                bundle={bundle}
                selected={selectedBundleKey === bundle.key}
                onClick={() => setSelectedBundleKey(bundle.key)}
              />
            ))}
          </div>
        )}
      </Card>

      <ReportBundleModal
        bundle={selectedBundle}
        onClose={() => setSelectedBundleKey('')}
        onOpenReport={setSelectedReport}
        bundleAction={selectedBundle && isGm && normalizeStatus(selectedBundle.status) === 'gm_submitted' ? {
          label: `Approve & release payroll (${selectedBundle.reportCount})`,
          loadingLabel: 'Approving...',
          loading: approvingKey === selectedBundle.key,
          disabled: approvingKey === selectedBundle.key,
          onClick: () => handleApproveBundle(selectedBundle),
        } : null}
      />

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  )
}
