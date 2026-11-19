import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Undo2 } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { returnDailyReportApi, updateDailyReportApi } from '../../../lib/api'
import { groupReportsIntoBundles } from '../../../shared/reports/report-bundle-utils'
import useLiveRefresh from '../../../shared/hooks/useLiveRefresh'
import { normalizeStatus } from '../../../shared/reports/report-status'
import ReportBundleCard from '../../../shared/reports/ReportBundleCard'
import ReportBundleModal from '../../../shared/reports/ReportBundleModal'
import ReportDetailModal from '../../../shared/reports/ReportDetailModal'
import ReturnReasonModal from '../../../shared/reports/ReturnReasonModal'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import { LinkButton } from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

/**
 * Production in-charge's queue of reports the GM sent back (gm_returned).
 * For each bundle or single report the PIC can resend it to the GM as it is,
 * or return it to the leadman who submitted it (with a reason).
 */
export default function ProductionReturnedReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const { dailyReports, refreshDailyReports, markNotificationsSeen } = useAppData()
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [busyKey, setBusyKey] = useState('')
  // Reports about to be sent back to their leadman (needs a reason).
  const [returnTarget, setReturnTarget] = useState(null) // { kind: 'bundle' | 'report', reports: [] }

  const isProductionInCharge = user?.role === 'production_incharge'

  useEffect(() => {
    if (!isProductionInCharge) return
    refreshDailyReports()
    markNotificationsSeen('daily_report_gm_returned')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProductionInCharge])

  // New GM returns show up without a reload (and don't relight the nav dot here).
  useLiveRefresh(() => refreshDailyReports().catch(() => {}), {
    types: ['daily_report_gm_returned'],
    clearTypes: ['daily_report_gm_returned'],
    intervalMs: 30000,
    enabled: isProductionInCharge,
  })

  const returnedReports = useMemo(
    () => (Array.isArray(dailyReports) ? dailyReports : []).filter((report) => normalizeStatus(report.status) === 'gm_returned'),
    [dailyReports]
  )
  const bundles = useMemo(() => groupReportsIntoBundles(returnedReports), [returnedReports])
  const selectedBundle = useMemo(() => bundles.find((bundle) => bundle.key === selectedBundleKey) || null, [bundles, selectedBundleKey])

  if (user?.role === 'gm') {
    return <Navigate to="/app/production/consolidated" replace />
  }

  if (!isProductionInCharge) {
    return <Navigate to="/app/production" replace />
  }

  const busy = Boolean(busyKey)

  async function resendToGm(reports, key) {
    if (!reports.length) return
    const confirmed = await dialog.confirm({
      title: 'Resend to GM',
      message: `Send ${plural(reports.length, 'report')} for ${reports[0].department} back to the GM for approval as they are?`,
      confirmText: 'Resend to GM',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setBusyKey(key)
    try {
      await Promise.all(reports.map((report) => updateDailyReportApi(report.id, {
        status: 'gm_submitted',
        verifiedBy: user?.id,
        verifiedByName: user?.name || user?.fullName || user?.username,
      })))
      await refreshDailyReports()
      setSelectedReport(null)
      if (reports.length > 1) setSelectedBundleKey('')
      dialog.success({ title: 'Resent to GM', message: 'The GM can review it again.' })
    } catch (error) {
      await refreshDailyReports()
      dialog.error({ title: 'Resend failed', message: error?.message || 'Unable to send it to the GM right now.' })
    } finally {
      setBusyKey('')
    }
  }

  async function handleReturnToLeadman(reason) {
    if (!returnTarget?.reports?.length) return
    setBusyKey('return')
    try {
      await Promise.all(returnTarget.reports.map((report) => returnDailyReportApi(report.id, reason)))
      await refreshDailyReports()
      setReturnTarget(null)
      setSelectedReport(null)
      if (returnTarget.kind === 'bundle') setSelectedBundleKey('')
      dialog.success({
        title: 'Returned to leadman',
        message: 'The leadman can now fix it and resubmit. It will go through verification and compiling again.',
      })
    } catch (error) {
      await refreshDailyReports()
      dialog.error({ title: 'Return failed', message: error?.message || 'Unable to return the report.' })
    } finally {
      setBusyKey('')
    }
  }

  const bundleActions = selectedBundle ? [
    {
      key: 'return',
      variant: 'dangerOutline',
      label: `Return to leadman (${selectedBundle.reportCount})`,
      disabled: busy,
      onClick: () => setReturnTarget({ kind: 'bundle', reports: selectedBundle.reports }),
    },
    {
      key: 'resend',
      label: `Resend to GM (${selectedBundle.reportCount})`,
      loadingLabel: 'Sending...',
      loading: busyKey === selectedBundle.key,
      disabled: busy,
      onClick: () => resendToGm(selectedBundle.reports, selectedBundle.key),
    },
  ] : []

  const reportActions = selectedReport && normalizeStatus(selectedReport.status) === 'gm_returned' ? [
    {
      key: 'return',
      variant: 'dangerOutline',
      label: 'Return to leadman',
      disabled: busy,
      onClick: () => setReturnTarget({ kind: 'report', reports: [selectedReport] }),
    },
    {
      key: 'resend',
      label: 'Resend to GM',
      loadingLabel: 'Sending...',
      loading: busyKey === selectedReport.id,
      disabled: busy,
      onClick: () => resendToGm([selectedReport], selectedReport.id),
    },
  ] : []

  const returnSubmitters = Array.from(new Set((returnTarget?.reports || []).map((report) => report.submittedByName).filter(Boolean)))

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        title="Returned by GM"
        description={`${plural(returnedReports.length, 'report')} sent back by the GM. Read the reason, then resend to the GM or return to the leadman who sent it.`}
        actions={(
          <LinkButton to="/app/production/compiled" variant="secondary">
            Compiled reports
          </LinkButton>
        )}
      />

      <Card className="space-y-4">
        {bundles.length === 0 ? (
          <EmptyState
            icon={Undo2}
            title="Nothing returned"
            description="When the GM sends a report back, it shows up here with the GM's reason."
          />
        ) : (
          <div className="space-y-3">
            {bundles.map((bundle) => (
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
        bundleActions={bundleActions}
      />

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} actions={reportActions} />

      {returnTarget ? (
        <ReturnReasonModal
          title={returnTarget.kind === 'bundle' ? 'Return this bundle to the leadman' : 'Return this report to the leadman'}
          description={`${returnSubmitters.join(', ') || 'The leadman'} will see your reason (and the GM's), fix the report and resubmit it. It then goes through verification and compiling again.`}
          confirmLabel="Return to leadman"
          loading={busyKey === 'return'}
          onConfirm={handleReturnToLeadman}
          onCancel={() => setReturnTarget(null)}
        />
      ) : null}
    </div>
  )
}
