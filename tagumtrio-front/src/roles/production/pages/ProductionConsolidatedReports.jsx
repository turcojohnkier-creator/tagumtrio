import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import { fetchDailyReportsApi } from '../../../lib/api'
import { groupReportsIntoBundles } from '../../../shared/reports/report-bundle-utils'
import { normalizeStatus } from '../../../shared/reports/report-status'
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
  const { user, t } = useAuth()
  const { approveDailyReport, markNotificationsSeen } = useAppData()
  const dialog = useDialog()
  const [reports, setReports] = useState([])

  useEffect(() => {
    markNotificationsSeen('daily_report_gm_pending')
  }, [])
  const [activeTab, setActiveTab] = useState('pending')
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [approvingKey, setApprovingKey] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedDate, setSelectedDate] = useState('')

  function loadReports() {
    return fetchDailyReportsApi()
      .then((result) => setReports(Array.isArray(result) ? result : []))
      .catch(() => setReports([]))
  }

  useEffect(() => {
    loadReports()
  }, [])

  // GM only ever sees reports that have reached gm_submitted (pending their
  // approval) or approved (payroll already released) — earlier pipeline
  // stages (submitted/leadman_verified/compiled/rejected) are not GM's concern.
  const gmRelevantReports = useMemo(
    () => reports.filter((report) => ['gm_submitted', 'approved'].includes(normalizeStatus(report.status))),
    [reports]
  )

  const allBundles = useMemo(() => groupReportsIntoBundles(gmRelevantReports), [gmRelevantReports])

  const departments = useMemo(() => {
    return ['All Departments', ...Array.from(new Set(allBundles.map((bundle) => bundle.department).filter(Boolean))).sort()]
  }, [allBundles])

  const filteredBundles = useMemo(() => {
    return allBundles.filter((bundle) => {
      const matchesDepartment = selectedDepartment === 'All Departments' || bundle.department === selectedDepartment
      const matchesDate = !selectedDate || toDateKey(bundle.reportDate) === selectedDate || bundle.reportDate === selectedDate
      return matchesDepartment && matchesDate
    })
  }, [allBundles, selectedDepartment, selectedDate])

  const pendingApprovalBundles = useMemo(() => filteredBundles.filter((bundle) => normalizeStatus(bundle.status) === 'gm_submitted'), [filteredBundles])
  const approvedBundles = useMemo(() => filteredBundles.filter((bundle) => normalizeStatus(bundle.status) === 'approved'), [filteredBundles])
  const visibleBundles = activeTab === 'approved' ? approvedBundles : pendingApprovalBundles
  const selectedBundle = useMemo(() => visibleBundles.find((bundle) => bundle.key === selectedBundleKey) || null, [visibleBundles, selectedBundleKey])

  const isGm = user?.role === 'gm'

  async function handleApproveBundle(bundle) {
    if (!bundle) return

    const confirmed = await dialog.confirm({
      title: t('gm.consolidated.confirm_title'),
      message: t('gm.consolidated.confirm_message').replace('{count}', bundle.reportCount),
      confirmText: t('gm.consolidated.confirm_confirm'),
      cancelText: t('gm.consolidated.confirm_cancel'),
    })
    if (!confirmed) return

    setApprovingKey(bundle.key)
    try {
      await Promise.all(bundle.reports.map((report) => approveDailyReport(report.id)))
      await loadReports()
      setSelectedBundleKey('')
      dialog.success({
        title: t('gm.consolidated.approved_title'),
        message: t('gm.consolidated.approved_message'),
      })
    } catch (error) {
      dialog.error({
        title: t('gm.consolidated.approval_failed_title'),
        message: error?.message || t('gm.consolidated.approval_failed_message'),
      })
    } finally {
      setApprovingKey('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('gm.consolidated.eyebrow')}
        title={t('gm.consolidated.title')}
        description={t('gm.consolidated.desc')}
      />

      <div className="grid gap-3 sm:grid-cols-2 sm:max-w-md">
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

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'pending' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          {t('gm.consolidated.tab_pending')} ({pendingApprovalBundles.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${activeTab === 'approved' ? 'border-emerald-500 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
        >
          {t('gm.consolidated.tab_approved')} ({approvedBundles.length})
        </button>
      </div>

      <Card className="space-y-4">
        {visibleBundles.length === 0 ? (
          <EmptyState title={activeTab === 'approved' ? t('gm.consolidated.empty_approved') : t('gm.consolidated.empty_pending')} />
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
          label: t('gm.consolidated.approve_btn').replace('{count}', selectedBundle.reportCount),
          loadingLabel: t('gm.consolidated.approving'),
          loading: approvingKey === selectedBundle.key,
          disabled: approvingKey === selectedBundle.key,
          onClick: () => handleApproveBundle(selectedBundle),
        } : null}
      />

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  )
}
