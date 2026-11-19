import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ArrowRight, Undo2 } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { updateDailyReportApi } from '../../../lib/api'
import { groupReportsIntoBundles } from '../../../shared/reports/report-bundle-utils'
import useLiveRefresh from '../../../shared/hooks/useLiveRefresh'
import { normalizeStatus } from '../../../shared/reports/report-status'
import ReportBundleCard from '../../../shared/reports/ReportBundleCard'
import ReportBundleModal from '../../../shared/reports/ReportBundleModal'
import ReportDetailModal from '../../../shared/reports/ReportDetailModal'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import { LinkButton } from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

// Reports the GM sent back live on their own page: ProductionReturnedReports.
export default function ProductionCompiledReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const { dailyReports, refreshDailyReports } = useAppData()
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [submittingKey, setSubmittingKey] = useState('')

  const isProductionInCharge = user?.role === 'production_incharge'

  useEffect(() => {
    if (!isProductionInCharge) return
    refreshDailyReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProductionInCharge])

  useLiveRefresh(() => refreshDailyReports().catch(() => {}), {
    types: ['daily_report_gm_returned', 'daily_report_ready_to_compile'],
    intervalMs: 30000,
    enabled: isProductionInCharge,
  })

  const { compiledReports, returnedCount } = useMemo(() => {
    const list = Array.isArray(dailyReports) ? dailyReports : []
    return {
      compiledReports: list.filter((report) => normalizeStatus(report.status) === 'compiled'),
      returnedCount: list.filter((report) => normalizeStatus(report.status) === 'gm_returned').length,
    }
  }, [dailyReports])

  const bundles = useMemo(() => groupReportsIntoBundles(compiledReports), [compiledReports])
  const selectedBundle = useMemo(() => bundles.find((bundle) => bundle.key === selectedBundleKey) || null, [bundles, selectedBundleKey])

  if (user?.role === 'gm') {
    return <Navigate to="/app/production/consolidated" replace />
  }

  if (!isProductionInCharge) {
    return <Navigate to="/app/production" replace />
  }

  async function handleSubmitBundle(bundle) {
    if (!bundle) return

    const confirmed = await dialog.confirm({
      title: 'Submit bundle to GM',
      message: `Send all ${plural(bundle.reportCount, 'report')} for ${bundle.department} to GM consolidated review?`,
      confirmText: 'Submit bundle',
      cancelText: 'Cancel',
    })
    if (!confirmed) return

    setSubmittingKey(bundle.key)
    try {
      await Promise.all(bundle.reports.map((report) => updateDailyReportApi(report.id, {
        status: 'gm_submitted',
        verifiedBy: user?.id,
        verifiedByName: user?.name || user?.fullName || user?.username,
      })))
      await refreshDailyReports()
      setSelectedBundleKey('')
      dialog.success({
        title: 'Submitted successfully',
        message: 'The bundle has been submitted to GM consolidated review.',
      })
    } catch (submitError) {
      await refreshDailyReports()
      dialog.error({
        title: 'Submission failed',
        message: submitError?.message || 'Unable to submit the bundle at this time.',
      })
    } finally {
      setSubmittingKey('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        tone="brand"
        title="Compiled Production Reports"
        description="Each card bundles a department's compiled reports for one day. Open a bundle to review the individual reports, then submit it to GM as one batch."
        actions={(
          <LinkButton to="/app/production" variant="secondary">
            Back to production dashboard
          </LinkButton>
        )}
      />

      {returnedCount > 0 ? (
        <Link
          to="/app/production/returned"
          className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 transition-colors hover:bg-rose-100"
        >
          <span className="flex items-center gap-2">
            <Undo2 className="h-4 w-4 shrink-0 text-rose-600" />
            <span><span className="font-semibold">{plural(returnedCount, 'report')}</span> returned by the GM need your attention.</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 font-semibold text-rose-700">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ) : null}

      <Card className="space-y-4">
        {bundles.length === 0 ? (
          <EmptyState title="No compiled reports" description="Use the production dashboard to compile a verified report." />
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
        bundleAction={selectedBundle ? {
          label: `Submit bundle to GM (${selectedBundle.reportCount})`,
          loadingLabel: 'Submitting...',
          loading: submittingKey === selectedBundle.key,
          disabled: Boolean(submittingKey),
          onClick: () => handleSubmitBundle(selectedBundle),
        } : null}
      />

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  )
}
