import { ChevronRight, X } from 'lucide-react'
import Portal from '../ui/Portal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { useAuth } from '../../context/auth-context'
import { getStatusLabel, getStatusVariant, normalizeStatus } from './report-status'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

export default function ReportBundleModal({ bundle, onClose, onOpenReport, bundleAction }) {
  const { t } = useAuth()
  if (!bundle) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.modal.daily_reports_for_day')}</p>
              <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{bundle.department}</h3>
              <p className="mt-1 text-sm text-zinc-500">{bundle.reportCount} report{bundle.reportCount === 1 ? '' : 's'} • {bundle.employeeCount} employee{bundle.employeeCount === 1 ? '' : 's'} • ₱{Number(bundle.totalAmount || 0).toLocaleString()}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 px-2 py-2">
            {bundle.reports.map((report) => {
              const entries = Array.isArray(report.entries) ? report.entries : []
              const amount = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
              const employeeCount = new Set(entries.map((entry) => String(entry.employeeId ?? entry.employeeName ?? ''))).size
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onOpenReport(report)}
                  className="flex w-full items-center justify-between gap-4 px-3 py-3 text-left transition-colors hover:bg-emerald-50/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-zinc-900">{report.submittedByName || report.submittedBy || t('report.detail.unknown')}</p>
                      <Badge variant={getStatusVariant(report.status)}>{t(`status.${normalizeStatus(report.status)}`, getStatusLabel(report.status))}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{formatDateTime(report.createdAt || report.created_at || report.reportDate)} • {employeeCount} employee{employeeCount === 1 ? '' : 's'} • ₱{amount.toLocaleString()}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('report.modal.close')}
            </Button>
            {bundleAction ? (
              <Button type="button" disabled={bundleAction.disabled} onClick={bundleAction.onClick}>
                {bundleAction.loading ? bundleAction.loadingLabel || t('report.modal.working') : bundleAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  )
}
