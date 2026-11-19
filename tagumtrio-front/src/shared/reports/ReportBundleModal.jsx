import { ChevronRight, X } from 'lucide-react'
import { motion } from 'framer-motion'
import Portal from '../ui/Portal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import UserAvatar from '../ui/UserAvatar'
import { useAuth } from '../../context/auth-context'
import { getLatestReturn, getStatusLabel, getStatusVariant, normalizeStatus, returnLabel } from './report-status'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

// `bundleActions`: [{ key, label, loadingLabel, loading, disabled, variant, onClick }],
// rendered left-to-right before the primary `bundleAction` (kept for older callers).
export default function ReportBundleModal({ bundle, onClose, onOpenReport, bundleAction, bundleActions = [] }) {
  const { t } = useAuth()
  if (!bundle) return null
  const actions = [...bundleActions, ...(bundleAction ? [bundleAction] : [])]

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] overflow-y-auto p-4">
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <div className="relative flex min-h-full items-center justify-center">
        <motion.div
          className="relative z-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.modal.daily_reports_for_day')}</p>
              <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{bundle.department}</h3>
              <p className="mt-1 text-sm text-zinc-500">{bundle.reportCount} report{bundle.reportCount === 1 ? '' : 's'} • {bundle.employeeCount} employee{bundle.employeeCount === 1 ? '' : 's'} • ₱{Number(bundle.totalAmount || 0).toLocaleString()}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="btn-dismiss rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="divide-y divide-zinc-100 px-2 py-2">
            {bundle.reports.map((report) => {
              const entries = Array.isArray(report.entries) ? report.entries : []
              const amount = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
              const employeeCount = new Set(entries.map((entry) => String(entry.employeeId ?? entry.employeeName ?? ''))).size
              const latestReturn = ['gm_returned', 'returned'].includes(normalizeStatus(report.status)) ? getLatestReturn(report) : null
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onOpenReport(report)}
                  className="flex w-full items-center justify-between gap-4 px-3 py-3 text-left transition-colors hover:bg-emerald-50/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <UserAvatar userId={report.submittedBy} name={report.submittedByName} size="sm" />
                      <p className="font-medium text-zinc-900">{report.submittedByName || report.submittedBy || t('report.detail.unknown')}</p>
                      <Badge variant={getStatusVariant(report.status)}>{t(`status.${normalizeStatus(report.status)}`, getStatusLabel(report.status))}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">{formatDateTime(report.createdAt || report.created_at || report.reportDate)} • {employeeCount} employee{employeeCount === 1 ? '' : 's'} • ₱{amount.toLocaleString()}</p>
                    {latestReturn ? (
                      <p className="mt-1.5 text-xs text-rose-800">
                        <span className="font-semibold text-rose-700">{returnLabel(latestReturn, t)}:</span> {latestReturn.reason}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </button>
              )
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            <Button type="button" variant="secondary" className="btn-dismiss" onClick={onClose}>
              {t('report.modal.close')}
            </Button>
            {actions.map((action, index) => (
              <Button key={action.key || index} type="button" variant={action.variant || 'primary'} disabled={action.disabled} onClick={action.onClick}>
                {action.loading ? action.loadingLabel || t('report.modal.working') : action.label}
              </Button>
            ))}
          </div>
        </motion.div>
        </div>
      </div>
    </Portal>
  )
}
