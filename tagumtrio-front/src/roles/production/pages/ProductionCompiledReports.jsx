import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import { updateDailyReportApi } from '../../../lib/api'
import { groupReportsIntoBundles } from '../../../shared/reports/report-bundle-utils'
import ReportBundleCard from '../../../shared/reports/ReportBundleCard'
import ReportBundleModal from '../../../shared/reports/ReportBundleModal'
import ReportDetailModal from '../../../shared/reports/ReportDetailModal'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import { LinkButton } from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

export default function ProductionCompiledReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const { dailyReports, refreshDailyReports } = useAppData()
  const [selectedBundleKey, setSelectedBundleKey] = useState('')
  const [selectedReport, setSelectedReport] = useState(null)
  const [submittingKey, setSubmittingKey] = useState('')

  if (user?.role === 'gm') {
    return <Navigate to="/app/production/consolidated" replace />
  }

  if (user?.role !== 'production_incharge') {
    return <Navigate to="/app/production" replace />
  }

  const compiledReports = useMemo(() => {
    return (Array.isArray(dailyReports) ? dailyReports : []).filter(
      (report) => String(report.status || '').toLowerCase() === 'compiled'
    )
  }, [dailyReports])

  const bundles = useMemo(() => groupReportsIntoBundles(compiledReports), [compiledReports])
  const selectedBundle = useMemo(() => bundles.find((bundle) => bundle.key === selectedBundleKey) || null, [bundles, selectedBundleKey])

  async function handleSubmitBundle(bundle) {
    if (!bundle) return

    const confirmed = await dialog.confirm({
      title: 'Submit bundle to GM',
      message: `Send all ${bundle.reportCount} report${bundle.reportCount === 1 ? '' : 's'} for ${bundle.department} to GM consolidated review?`,
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
        title="Compiled Production Reports"
        description="Each card bundles a department's compiled reports for one day. Open a bundle to review the individual reports, then submit it to GM as one batch."
        actions={(
          <LinkButton to="/app/production" variant="secondary">
            Back to production dashboard
          </LinkButton>
        )}
      />

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
          disabled: submittingKey === selectedBundle.key,
          onClick: () => handleSubmitBundle(selectedBundle),
        } : null}
      />

      <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </div>
  )
}
