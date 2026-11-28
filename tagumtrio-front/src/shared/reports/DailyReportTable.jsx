import { useMemo, useState } from 'react'
import { Image as ImageIcon, Users, X } from 'lucide-react'
import Portal from '../ui/Portal'
import UserAvatar from '../ui/UserAvatar'
import ProfileLink from '../profile/ProfileLink'
import { useAuth } from '../../context/auth-context'
import { formatPeso, groupBatches, summarizeBatches } from './report-entry-utils'
import { formatProductWithUnit } from '../../lib/units'

function EmployeeListPopup({ open, workers, onClose }) {
  const { t } = useAuth()
  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-4">
        <div className="flex min-h-full items-center justify-center py-8">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">
              <h4 className="font-heading text-base font-semibold text-zinc-900">{t('table.employees_involved')} ({workers.length})</h4>
              <button type="button" onClick={onClose} aria-label="Close" className="btn-dismiss rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-zinc-100">
              {workers.map((worker, index) => (
                <li key={`${worker.id ?? worker.name}-${index}`} className="px-5 py-3">
                  <ProfileLink userId={worker.id} name={worker.name} className="flex items-center gap-3">
                    <UserAvatar userId={worker.id} name={worker.name} size="md" />
                    <span className="min-w-0">
                      <span className="block font-medium text-zinc-900">{worker.name || t('table.unknown_employee')}</span>
                      <span className="block text-xs text-zinc-400">{worker.identifier || '-'}</span>
                    </span>
                  </ProfileLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Portal>
  )
}

function PhotoGridPopup({ open, photos, onClose }) {
  const { t } = useAuth()
  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-4">
        <div className="flex min-h-full items-center justify-center py-8">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">
              <h4 className="font-heading text-base font-semibold text-zinc-900">{t('table.evidence_photos')} ({photos.length})</h4>
              <button type="button" onClick={onClose} aria-label="Close" className="btn-dismiss rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {photos.map((photo, index) => (
                <figure key={`${photo.label}-${index}`} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  <img src={photo.src} alt={photo.label || `Evidence ${index + 1}`} className="h-40 w-full object-cover" />
                  {photo.label ? <figcaption className="px-3 py-1.5 text-xs font-medium text-zinc-600">{photo.label}</figcaption> : null}
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

// The one report table used everywhere a report is shown (Create Report
// review, Incoming Reports, History, Production, GM). One row per batch;
// Employees and Photos open popups; the footer totals the whole report.
export default function DailyReportTable({ entries = [], fallbackDepartment = '', fallbackDate = '' }) {
  const { t } = useAuth()
  const [employeePopupBatch, setEmployeePopupBatch] = useState(null)
  const [photoPopupBatch, setPhotoPopupBatch] = useState(null)

  const batches = useMemo(() => groupBatches(entries, fallbackDepartment, fallbackDate), [entries, fallbackDepartment, fallbackDate])
  const totals = useMemo(() => summarizeBatches(batches), [batches])

  if (batches.length === 0) {
    return <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-zinc-500">{t('table.no_entries')}</div>
  }

  const th = 'px-4 py-3 font-medium whitespace-nowrap'

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50/70 text-emerald-800">
            <tr>
              <th className={th}>{t('table.department')}</th>
              <th className={th}>{t('table.product')}</th>
              <th className={th}>{t('table.quantity')}</th>
              <th className={th}>{t('table.date')}</th>
              <th className={th}>{t('table.employees')}</th>
              <th className={th}>{t('table.photos')}</th>
              <th className={`${th} text-right`}>{t('table.rate_per_head')}</th>
              <th className={`${th} text-right`}>{t('table.total_amount')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {batches.map((batch, index) => (
              <tr key={batch.key} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
                <td className="px-4 py-4 whitespace-nowrap">{batch.department || '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap">{batch.product ? formatProductWithUnit(batch.product, batch.department) : '-'}</td>
                <td className="px-4 py-4 tabular-nums">{batch.quantity ? batch.quantity.toLocaleString() : '-'}</td>
                <td className="px-4 py-4 whitespace-nowrap">{batch.date || '-'}</td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setEmployeePopupBatch(batch)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Users className="h-3.5 w-3.5" /> {batch.workers.length}
                  </button>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    disabled={batch.photos.length === 0}
                    onClick={() => setPhotoPopupBatch(batch)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> {batch.photos.length}
                  </button>
                </td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-emerald-700 whitespace-nowrap">{formatPeso(batch.ratePerHead)}</td>
                <td className="px-4 py-4 text-right font-semibold tabular-nums text-zinc-900 whitespace-nowrap">{formatPeso(batch.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-zinc-200 bg-zinc-50 text-zinc-900">
            <tr>
              <td className="px-4 py-3 font-semibold whitespace-nowrap" colSpan={2}>
                {t('table.total')} ({totals.batchCount} batch{totals.batchCount === 1 ? '' : 'es'})
              </td>
              <td className="px-4 py-3 font-semibold tabular-nums">{totals.totalQuantity.toLocaleString()}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 font-semibold whitespace-nowrap">{totals.workerCount} worker{totals.workerCount === 1 ? '' : 's'}</td>
              <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{totals.photos.length} photo{totals.photos.length === 1 ? '' : 's'}</td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700 whitespace-nowrap">{formatPeso(totals.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <EmployeeListPopup
        open={Boolean(employeePopupBatch)}
        workers={employeePopupBatch?.workers || []}
        onClose={() => setEmployeePopupBatch(null)}
      />
      <PhotoGridPopup
        open={Boolean(photoPopupBatch)}
        photos={photoPopupBatch?.photos || []}
        onClose={() => setPhotoPopupBatch(null)}
      />
    </>
  )
}
