import { useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { useQr } from '../../context/qr-context'

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
  const { dailyReports, updateDailyReportStatus, refreshDailyReports } = useQr()
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Compiled Production Reports</h2>
          <p className="mt-1 text-slate-400">These compiled reports are ready to be submitted to GM consolidated review.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/app/production"
            className="inline-flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-900"
          >
            Back to production dashboard
          </Link>
          
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        {compiledReports.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-6 text-sm text-slate-400">
            No compiled reports available. Use the production dashboard to compile a submitted report.
          </div>
        ) : (
          <div className="space-y-4">
            {compiledReports.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Compiled report</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">{report.department || 'Unknown department'}</h3>
                    <p className="mt-1 text-sm text-slate-400">Submitted {formatReportDate(report.createdAt || report.created_at || report.reportDate)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">Employees: {Array.isArray(report.entries) ? report.entries.length : 0}</span>
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-slate-300">Status: {report.status || 'compiled'}</span>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Thickness</p>
                    <p className="mt-2 text-sm text-white">{report.thickness || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Crates / pieces</p>
                    <p className="mt-2 text-sm text-white">{report.cratesPieces || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Submitted by</p>
                    <p className="mt-2 text-sm text-white">{report.submittedBy || 'Unknown'}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-300">Report ID: {report.id}</p>
                  <button
                    type="button"
                    onClick={() => handleSubmitToGM(report)}
                    disabled={submittingReportId === report.id}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submittingReportId === report.id ? 'Submitting...' : 'Submit to GM'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
