import { useState } from 'react'
import { Image as ImageIcon, X } from 'lucide-react'
import Portal from '../ui/Portal'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { useAuth } from '../../context/auth-context'
import DailyReportTable from './DailyReportTable'
import { getReportPhotos } from './report-entry-utils'
import { getStatusLabel, getStatusVariant, normalizeStatus } from './report-status'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString()
}

export default function ReportDetailModal({ report, onClose }) {
  const { t } = useAuth()
  const [previewPhotos, setPreviewPhotos] = useState(null)
  if (!report) return null

  const entries = Array.isArray(report.entries) ? report.entries : []
  const firstEntry = entries[0] || {}
  const totalAmount = entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
  const employeeCount = new Set(entries.map((entry) => String(entry.employeeId ?? entry.employeeName ?? ''))).size
  const photos = getReportPhotos(entries)

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.daily_report')}</p>
              <div className="mt-1 flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-zinc-900">{report.department || t('report.detail.unknown_department')}</h3>
                <Badge variant={getStatusVariant(report.status)}>{t(`status.${normalizeStatus(report.status)}`, getStatusLabel(report.status))}</Badge>
              </div>
              <p className="mt-1 text-sm text-zinc-500">{t('report.detail.submitted_by')} {report.submittedByName || report.submittedBy || t('report.detail.unknown')} • {formatDateTime(report.createdAt || report.created_at || report.reportDate)}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.employees_involved')}</p>
                <p className="mt-2 font-heading text-2xl font-bold text-zinc-900">{employeeCount}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.product')}</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{firstEntry.product || '-'}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.quantity')}</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{firstEntry.quantity || '-'}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.total_amount')}</p>
                <p className="mt-2 text-lg font-semibold text-emerald-700">₱{totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.notes')}</p>
              <p className="mt-2 text-sm text-zinc-800">{report.summary || t('report.detail.no_notes')}</p>
            </div>

            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-zinc-400">{t('report.detail.images')}</p>
                <p className="mt-2 text-sm text-zinc-800">{photos.length} photo{photos.length === 1 ? '' : 's'}</p>
              </div>
              <div className="flex items-end justify-end">
                {photos.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setPreviewPhotos(photos)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-white"
                  >
                    <ImageIcon className="h-4 w-4" />
                    {t('report.detail.preview_images')}
                  </button>
                ) : (
                  <p className="text-sm text-zinc-400">{t('report.detail.no_images')}</p>
                )}
              </div>
            </div>

            <DailyReportTable entries={entries} fallbackDepartment={report.department} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              {t('report.detail.close')}
            </Button>
          </div>
        </div>
      </div>

      {previewPhotos ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-heading text-lg font-bold text-zinc-900">{t('report.detail.report_images')}</h3>
              <button type="button" onClick={() => setPreviewPhotos(null)} className="text-zinc-500 hover:text-zinc-900">{t('report.detail.close')}</button>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {previewPhotos.map((photo, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                  <img src={photo} alt={`Report ${index + 1}`} className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </Portal>
  )
}
