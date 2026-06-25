import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useDialog } from '../../../context/dialog-context'
import { useAppData } from '../../../context/app-data-context'
import PageHeader from '../../../shared/ui/PageHeader'
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

export default function ProductionCompiledReports() {
  const { user } = useAuth()
  const dialog = useDialog()
  const { dailyReports, updateDailyReportStatus, refreshDailyReports } = useAppData()
  const [submittingReportId, setSubmittingReportId] = useState('')

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

  async function handleSubmitToGM(report) {
    if (!report?.id) return

    const confirmed = await dialog.confirm({
      title: 'Submit compiled report to GM',
      message: `Send report ${report.id} to GM consolidated review?`,
      confirmText: 'Submit',
      cancelText: 'Cancel',
    })

    if (!confirmed) return

    setSubmittingReportId(report.id)
    try {
      await updateDailyReportStatus(report.id, {
        status: 'gm_submitted',
        verifiedBy: user?.id,
        verifiedByName: user?.name || user?.fullName || user?.username,
      })
      await refreshDailyReports()
      dialog.success({
        title: 'Submitted successfully',
        message: 'The compiled report has been submitted to GM consolidated review.',
      })
    } catch (submitError) {
      dialog.error({
        title: 'Submission failed',
        message: submitError?.message || 'Unable to submit the report at this time.',
      })
    } finally {
      setSubmittingReportId('')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compiled Production Reports"
        description="These compiled reports are ready to be submitted to GM consolidated review."
        actions={(
          <LinkButton to="/app/production" variant="secondary">
            Back to production dashboard
          </LinkButton>
        )}
      />

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm p-6 space-y-4">
        {compiledReports.length === 0 ? (
          <EmptyState title="No compiled reports" description="Use the production dashboard to compile a submitted report." />
        ) : (
          <div className="space-y-4">
            {compiledReports.map((report) => (
              <div key={report.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Compiled report</p>
                    <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{report.department || 'Unknown department'}</h3>
                    <p className="mt-1 text-sm text-zinc-500">Submitted {formatReportDate(report.createdAt || report.created_at || report.reportDate)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <Badge variant="success">Employees: {Array.isArray(report.entries) ? report.entries.length : 0}</Badge>
                    <Badge variant="success">Status: {report.status || 'compiled'}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-emerald-200 bg-white shadow-sm px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Thickness</p>
                    <p className="mt-2 text-sm text-zinc-900">{report.thickness || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white shadow-sm px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Crates / pieces</p>
                    <p className="mt-2 text-sm text-zinc-900">{report.cratesPieces || '-'}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-white shadow-sm px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-zinc-400">Submitted by</p>
                    <p className="mt-2 text-sm text-zinc-900">{report.submittedBy || 'Unknown'}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-zinc-700">Report ID: {report.id}</p>
                  <Button
                    type="button"
                    onClick={() => handleSubmitToGM(report)}
                    disabled={submittingReportId === report.id}
                  >
                    {submittingReportId === report.id ? 'Submitting...' : 'Submit to GM'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
