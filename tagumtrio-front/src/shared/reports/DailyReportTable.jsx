import { useMemo, useState } from 'react'
import { Image as ImageIcon, Users, X } from 'lucide-react'
import Portal from '../ui/Portal'
import { useAuth } from '../../context/auth-context'
import { getEntryIdentifier, getEntryLabel, getEntryPieces, hasMeaningfulEntry } from './report-entry-utils'
import { formatProductWithUnit } from '../../lib/units'

function resolveEntryDepartment(entry, fallbackDepartment) {
  return entry?.department
    || entry?.raw?.department
    || fallbackDepartment
    || '-'
}

function getBatchKey(entry, index) {
  return String(entry?.batchId || entry?.raw?.batchId || entry?.id || `row-${index}`)
}

function getBatchPhotos(entry) {
  const photos = entry?.photos || entry?.raw?.photos
  if (!photos) return []
  if (Array.isArray(photos)) return photos.filter(Boolean)
  return Object.values(photos).filter(Boolean)
}

function groupIntoBatches(entries, fallbackDepartment) {
  const batches = new Map()

  entries.forEach((entry, index) => {
    const key = getBatchKey(entry, index)
    if (!batches.has(key)) {
      batches.set(key, {
        key,
        department: resolveEntryDepartment(entry, fallbackDepartment),
        product: entry.product || entry.raw?.product || '-',
        quantity: entry.quantity || getEntryPieces(entry) || '-',
        date: entry.date || entry.dateIn || entry.raw?.qrFields?.date || entry.qrFields?.date || entry.raw?.qrFields?.dateIn || entry.qrFields?.dateIn || '-',
        amount: Number(entry.amount || 0),
        photos: getBatchPhotos(entry),
        entries: [],
      })
    }
    batches.get(key).entries.push(entry)
  })

  return Array.from(batches.values())
}

function EmployeeListPopup({ open, entries, onClose }) {
  const { t } = useAuth()
  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-4">
        <div className="flex min-h-full items-center justify-center py-8">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">
              <h4 className="font-heading text-base font-semibold text-zinc-900">{t('table.employees_involved')} ({entries.length})</h4>
              <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="divide-y divide-zinc-100">
              {entries.map((entry, index) => (
                <li key={entry.id || `${getEntryIdentifier(entry)}-${index}`} className="px-5 py-3">
                  <p className="font-medium text-zinc-900">{getEntryLabel(entry) || t('table.unknown_employee')}</p>
                  <p className="text-xs text-zinc-400">{getEntryIdentifier(entry) || '-'}</p>
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
              <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              {photos.map((photo, index) => (
                <div key={index} className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
                  <img src={photo} alt={`Evidence ${index + 1}`} className="h-40 w-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default function DailyReportTable({ entries = [], fallbackDepartment = '' }) {
  const { t } = useAuth()
  const [employeePopupBatch, setEmployeePopupBatch] = useState(null)
  const [photoPopupBatch, setPhotoPopupBatch] = useState(null)

  const batches = useMemo(() => {
    const safeEntries = Array.isArray(entries) ? entries.filter(hasMeaningfulEntry) : []
    return groupIntoBatches(safeEntries, fallbackDepartment)
  }, [entries, fallbackDepartment])

  if (batches.length === 0) {
    return <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-zinc-500">{t('table.no_entries')}</div>
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-emerald-50/70 text-emerald-800">
            <tr>
              <th className="px-4 py-3 font-medium">{t('table.department')}</th>
              <th className="px-4 py-3 font-medium">{t('table.product')}</th>
              <th className="px-4 py-3 font-medium">{t('table.quantity')}</th>
              <th className="px-4 py-3 font-medium">{t('table.date')}</th>
              <th className="px-4 py-3 font-medium">{t('table.amount')}</th>
              <th className="px-4 py-3 font-medium">{t('table.employees')}</th>
              <th className="px-4 py-3 font-medium">{t('table.photos')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {batches.map((batch, index) => (
              <tr key={batch.key} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
                <td className="px-4 py-4 text-zinc-700">{batch.department}</td>
                <td className="px-4 py-4 text-zinc-700">{formatProductWithUnit(batch.product, batch.department)}</td>
                <td className="px-4 py-4 text-zinc-700">{batch.quantity}</td>
                <td className="px-4 py-4 text-zinc-700">{batch.date}</td>
                <td className="px-4 py-4 font-semibold text-emerald-700">₱{batch.amount.toLocaleString()}</td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    onClick={() => setEmployeePopupBatch(batch)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <Users className="h-3.5 w-3.5" /> {batch.entries.length}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EmployeeListPopup
        open={Boolean(employeePopupBatch)}
        entries={employeePopupBatch?.entries || []}
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
