import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { useDialog } from '../../../context/dialog-context'
import { fetchDailyReportsApi, returnDailyReportApi } from '../../../lib/api'
import ReturnReasonModal from '../../../shared/reports/ReturnReasonModal'
import useLiveRefresh from '../../../shared/hooks/useLiveRefresh'
import { groupReportsIntoBundles } from '../../../shared/reports/report-bundle-utils'
import { normalizeStatus } from '../../../shared/reports/report-status'
import ReportBundleCard from '../../../shared/reports/ReportBundleCard'
import ReportBundleModal from '../../../shared/reports/ReportBundleModal'
import ReportDetailModal from '../../../shared/reports/ReportDetailModal'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import EmptyState from '../../../shared/ui/EmptyState'
import { LinkButton } from '../../../shared/ui/Button'
import { History } from 'lucide-react'
import { toManilaDateKey } from '../../../lib/datetime'

function toDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return toManilaDateKey(date)
}

export default function ProductionConsolidatedReports() {
  const { user, t } = useAuth()
  const { approveDailyReport, markNotificationsSeen } = useAppData()
  const dialog = useDialog()
  const [reports, setReports] = useState([])

  useEffect(() => {
    markNotificationsSeen('daily_report_gm_pending')
  }, [])
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [approvingKey, setApprovingKey] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedDate, setSelectedDate] = useState('')
  // What the GM is about to return: a whole bundle or one report inside it.
  const [returnTarget, setReturnTarget] = useState(null) // { kind: 'bundle' | 'report', reports: [] }
  const [returning, setReturning] = useState(false)

  function loadReports() {
    return fetchDailyReportsApi()
      .then((result) => setReports(Array.isArray(result) ? result : []))
      // Keep what is shown if a (background) refresh fails.
      .catch(() => {})
  }

  useEffect(() => {
    loadReports()
  }, [])

  // New bundles from production in-charge appear without a reload.
  useLiveRefresh(loadReports, { types: ['daily_report_gm_pending'], clearTypes: ['daily_report_gm_pending'], intervalMs: 30000 })

  // This page is the GM's approval queue: only reports the production
  // in-charge has sent up (gm_submitted). Reports the GM already approved
  // live on the History page (/app/history) instead.
  const pendingReports = useMemo(
    () => reports.filter((report) => normalizeStatus(report.status) === 'gm_submitted'),
    [reports]
  )

  const allBundles = useMemo(() => groupReportsIntoBundles(pendingReports), [pendingReports])

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

  const selectedBundle = useMemo(() => filteredBundles.find((bundle) => bundle.key === selectedBundleKey) || null, [filteredBundles, selectedBundleKey])

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

  async function handleReturn(reason) {
    if (!returnTarget?.reports?.length) return
    setReturning(true)
    try {
      await Promise.all(returnTarget.reports.map((report) => returnDailyReportApi(report.id, reason)))
      await loadReports()
      setReturnTarget(null)
      setSelectedReport(null)
      // A returned bundle is gone from the queue; a single return leaves the rest open.
      if (returnTarget.kind === 'bundle') setSelectedBundleKey('')
      dialog.success({
        title: t('gm.consolidated.returned_title'),
        message: t('gm.consolidated.returned_message'),
      })
    } catch (error) {
      await loadReports()
      dialog.error({
        title: t('gm.consolidated.return_failed_title'),
        message: error?.message || t('gm.consolidated.return_failed_message'),
      })
    } finally {
      setReturning(false)
    }
  }

  const busy = Boolean(approvingKey) || returning
  const canReturnSelectedReport = isGm && selectedReport && normalizeStatus(selectedReport.status) === 'gm_submitted'

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        title={t('gm.consolidated.title')}
        description={`${filteredBundles.length} bundle${filteredBundles.length === 1 ? '' : 's'} waiting for your approval.`}
        actions={isGm ? (
          <LinkButton to="/app/history" variant="secondary">
            <History className="h-4 w-4" />
            {t('gm.consolidated.view_history', 'View approved in History')}
          </LinkButton>
        ) : null}
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

      <Card className="space-y-4">
        {filteredBundles.length === 0 ? (
          <EmptyState title={t('gm.consolidated.empty_pending')} />
        ) : (
          <motion.div
            className="space-y-3"
            initial="hidden" animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          >
            {filteredBundles.map((bundle) => (
              <motion.div
                key={bundle.key}
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }}
              >
                <ReportBundleCard
                  bundle={bundle}
                  selected={selectedBundleKey === bundle.key}
                  onClick={() => setSelectedBundleKey(bundle.key)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </Card>

      <ReportBundleModal
        bundle={selectedBundle}
        onClose={() => setSelectedBundleKey('')}
        onOpenReport={setSelectedReport}
        bundleActions={selectedBundle && isGm ? [{
          key: 'return',
          variant: 'dangerOutline',
          label: t('gm.consolidated.return_bundle_btn').replace('{count}', selectedBundle.reportCount),
          disabled: busy,
          onClick: () => setReturnTarget({ kind: 'bundle', reports: selectedBundle.reports }),
        }] : []}
        bundleAction={selectedBundle && isGm ? {
          label: t('gm.consolidated.approve_btn').replace('{count}', selectedBundle.reportCount),
          loadingLabel: t('gm.consolidated.approving'),
          loading: approvingKey === selectedBundle.key,
          disabled: busy,
          onClick: () => handleApproveBundle(selectedBundle),
        } : null}
      />

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        actions={canReturnSelectedReport ? [{
          key: 'return',
          variant: 'dangerOutline',
          label: t('gm.consolidated.return_report_btn'),
          disabled: busy,
          onClick: () => setReturnTarget({ kind: 'report', reports: [selectedReport] }),
        }] : []}
      />

      {returnTarget ? (
        <ReturnReasonModal
          title={t(returnTarget.kind === 'bundle' ? 'gm.consolidated.return_title_bundle' : 'gm.consolidated.return_title_report')}
          description={t('gm.consolidated.return_desc')}
          confirmLabel={t('gm.consolidated.return_confirm')}
          loading={returning}
          onConfirm={handleReturn}
          onCancel={() => setReturnTarget(null)}
        />
      ) : null}
    </div>
  )
}
