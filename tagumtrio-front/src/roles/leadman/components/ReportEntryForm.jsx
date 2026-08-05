import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Image as ImageIcon, Plus, X } from 'lucide-react'
import { motion } from 'framer-motion'
import Portal from '../../../shared/ui/Portal'
import Button from '../../../shared/ui/Button'
import DailyReportTable from '../../../shared/reports/DailyReportTable'
import { useAppData } from '../../../context/app-data-context'
import { formatEmployeeId } from '../../../lib/employeeId'
import { buildDepartmentReportSummary, getDepartmentReportFieldSpec } from '../../../constants/department-report-fields'
import { getNextDepartmentOptions } from '../../../constants/department-flow'

function normalizeEmployeeId(employee) {
  return String(employee.employeeId || employee.id || employee.identifier || '').trim()
}

function buildInitialValues(spec, department, overrides = {}) {
  const base = spec.fields.reduce((accumulator, field) => {
    if (field.key === 'department') {
      accumulator[field.key] = department || ''
      return accumulator
    }

    if (field.type === 'date') {
      accumulator[field.key] = new Date().toISOString().slice(0, 10)
      return accumulator
    }

    accumulator[field.key] = ''
    return accumulator
  }, {})
  return { ...base, ...overrides }
}

const FIXED_PHOTO_SLOTS = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
]
const FIXED_PHOTO_KEYS = FIXED_PHOTO_SLOTS.map((slot) => slot.key)
const EMPTY_PHOTOS = { front: null, back: null, left: null, right: null }

function generateExtraSlotKey() {
  return `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

// Any key in a photo object beyond the 4 fixed angles is an "extra" the leadman
// added — reconstruct that list so a resubmit reopens with the same slots.
function deriveExtraSlotKeys(photoPreview) {
  if (!photoPreview || typeof photoPreview !== 'object') return []
  return Object.keys(photoPreview).filter((key) => !FIXED_PHOTO_KEYS.includes(key))
}

// Downscale + re-encode before staging so a slow connection has far less to
// upload — phone camera photos can be several MB each; this brings them down
// to a few hundred KB without a visible quality loss in the verification photo.
function compressImageFile(file, { maxDimension = 1600, quality = 0.7 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Unable to read image file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Unable to load image file.'))
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function EmployeePickerModal({ open, department, employeeOptions, selectedEmployeeIds, onToggleEmployee, onClose }) {
  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl rounded-lg border border-zinc-200 bg-white shadow-sm max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
            <div>
              <h4 className="text-base font-semibold text-zinc-900">Employees Included</h4>
              <p className="text-sm text-zinc-500">Select the employees that belong in this report.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-800 transition-colors hover:bg-zinc-100">
              Close
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="sticky top-0 bg-emerald-50/70 text-emerald-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Select</th>
                  <th className="px-4 py-3 text-left font-medium">Employee No.</th>
                  <th className="px-4 py-3 text-left font-medium">Employee Name</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 text-zinc-800">
                {employeeOptions.map((employee) => {
                  const employeeId = normalizeEmployeeId(employee)
                  const isSelected = selectedEmployeeIds.includes(employeeId)

                  return (
                    <tr key={employeeId || employee.employeeId || employee.id || employee.identifier} className={isSelected ? 'bg-emerald-500/5' : ''}>
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleEmployee(employeeId)}
                          className="h-4 w-4 rounded border-zinc-300 bg-white text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3 align-middle font-medium text-zinc-900">{formatEmployeeId(employeeId)}</td>
                      <td className="px-4 py-3 align-middle">{employee.employeeName || employee.name || employee.fullName}</td>
                      <td className="px-4 py-3 align-middle text-zinc-700">{employee.department || department || employee.dept}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Portal>
  )
}

function ReportReviewModal({ open, department, product, quantity, pricePerUnit, totalAmount, perEmployeeAmount, payloads, isSubmitting, submissionError, onConfirm, onBack }) {
  if (!open) return null

  const employeeCount = payloads.length

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
        <motion.div
          className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-zinc-400">Review before submitting</p>
              <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{department || 'Report'}</h3>
              <p className="mt-1 text-sm text-zinc-500">Check the details below carefully. This is what will be recorded.</p>
            </div>
            <button type="button" onClick={onBack} className="rounded-full border border-zinc-300 bg-zinc-50 p-2 text-zinc-700 transition-colors hover:bg-zinc-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 py-4">
            {submissionError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700">{submissionError}</div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Employees</p>
                <p className="mt-2 font-heading text-2xl font-bold text-zinc-900">{employeeCount}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Product</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{product || '-'}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Quantity</p>
                <p className="mt-2 font-heading text-lg font-bold text-zinc-900">{quantity || '-'}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-400">Total amount</p>
                <p className="mt-2 text-lg font-semibold text-emerald-700">₱{totalAmount.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
              Rate: ₱{pricePerUnit.toLocaleString()} per unit · ₱{perEmployeeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} each for {employeeCount} employee{employeeCount === 1 ? '' : 's'}
            </div>

            <DailyReportTable entries={payloads} fallbackDepartment={department} />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
            <Button type="button" variant="secondary" onClick={onBack} disabled={isSubmitting}>
              Back to Edit
            </Button>
            <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Confirm & Submit'}
            </Button>
          </div>
        </motion.div>
      </div>
    </Portal>
  )
}

export default function ReportEntryForm({
  department,
  employeeOptions = [],
  initialEmployeeId = '',
  submitLabel = 'Create Report',
  onSubmit,
  initialValues: initialValuesOverride,
  initialSelectedEmployeeIds,
  initialTargetDepartment,
  initialPhotoPreview,
}) {
  const { getRatesForDepartment, getRateFor } = useAppData()
  const spec = useMemo(() => getDepartmentReportFieldSpec(department), [department])
  const departmentRates = useMemo(() => getRatesForDepartment(spec.department), [getRatesForDepartment, spec.department])
  const nextDepartmentOptions = useMemo(() => getNextDepartmentOptions(spec.department), [spec.department])

  const validEmployeeOptions = useMemo(() => {
    return employeeOptions
      .map((employee) => ({
        ...employee,
        normalizedEmployeeId: normalizeEmployeeId(employee),
      }))
      .filter((employee) => employee.normalizedEmployeeId && (employee.employeeName || employee.name || employee.fullName))
  }, [employeeOptions])

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => {
    if (initialSelectedEmployeeIds?.length) return initialSelectedEmployeeIds
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    return defaultId ? [defaultId] : []
  })
  const [showEmployeeTable, setShowEmployeeTable] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [reviewPayloads, setReviewPayloads] = useState(null)
  const [values, setValues] = useState(() => buildInitialValues(spec, department, initialValuesOverride))
  const [targetDepartment, setTargetDepartment] = useState(() => initialTargetDepartment || '')
  const [photos, setPhotos] = useState(EMPTY_PHOTOS)
  const [photoPreview, setPhotoPreview] = useState(() => initialPhotoPreview || EMPTY_PHOTOS)
  const [extraSlotKeys, setExtraSlotKeys] = useState(() => deriveExtraSlotKeys(initialPhotoPreview))

  // Department changed (e.g. leadman switched the selector) — reset the form for the new department.
  // Skipped when `department` hasn't actually changed since last run: a
  // `useEffect` with a dependency array still runs once right after mount
  // regardless of whether the dependency actually changed, which was wiping
  // out the initial* props (used to pre-fill the Edit & Resubmit form from
  // History) the instant the form appeared. A plain "is this the first
  // render" boolean isn't enough — StrictMode double-invokes effects in dev,
  // which would flip that boolean before the second invocation and reset
  // anyway; comparing against the last department this effect actually ran
  // for is safe under that double-invoke since the ref only advances on the
  // branch that performs a real reset.
  const previousDepartmentRef = useRef(department)
  useEffect(() => {
    if (previousDepartmentRef.current === department) return
    previousDepartmentRef.current = department
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    setSelectedEmployeeIds(defaultId ? [defaultId] : [])
    setShowEmployeeTable(false)
    setSubmissionError('')
    setIsSubmitting(false)
    setValues(buildInitialValues(spec, department))
    setTargetDepartment('')
    setPhotos(EMPTY_PHOTOS)
    setPhotoPreview(EMPTY_PHOTOS)
    setExtraSlotKeys([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department])

  // Single valid next department — auto-route without asking the leadman.
  useEffect(() => {
    if (nextDepartmentOptions.length === 1) {
      setTargetDepartment(nextDepartmentOptions[0])
    } else if (nextDepartmentOptions.length === 0) {
      setTargetDepartment('')
    }
  }, [nextDepartmentOptions])

  function handlePhotoChange(photoIndex, file) {
    if (!file) {
      setPhotos((current) => ({ ...current, [photoIndex]: null }))
      setPhotoPreview((current) => ({ ...current, [photoIndex]: null }))
      return
    }

    if (!file.type.startsWith('image/')) {
      setSubmissionError('Please upload only image files.')
      return
    }

    setPhotos((current) => ({ ...current, [photoIndex]: file }))
    setSubmissionError('')
    compressImageFile(file)
      .then((dataUrl) => {
        setPhotoPreview((current) => ({ ...current, [photoIndex]: dataUrl }))
      })
      .catch(() => {
        setSubmissionError('Unable to process that photo. Please try a different image.')
        setPhotos((current) => ({ ...current, [photoIndex]: null }))
      })
  }

  function addPhotoSlot() {
    setExtraSlotKeys((current) => [...current, generateExtraSlotKey()])
  }

  function removePhotoSlot(key) {
    setExtraSlotKeys((current) => current.filter((k) => k !== key))
    setPhotos((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setPhotoPreview((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const photoSlots = useMemo(() => [
    ...FIXED_PHOTO_SLOTS,
    ...extraSlotKeys.map((key, index) => ({ key, label: `Photo ${FIXED_PHOTO_SLOTS.length + 1 + index}`, removable: true })),
  ], [extraSlotKeys])

  const selectedEmployees = validEmployeeOptions.filter((employee) => selectedEmployeeIds.includes(employee.normalizedEmployeeId))

  const product = String(values.product || '').trim()
  const quantity = Number(values.quantity || 0)
  const pricePerUnit = getRateFor(spec.department, product)
  const hasRate = pricePerUnit !== null && pricePerUnit !== undefined
  const totalAmount = hasRate ? pricePerUnit * quantity : 0
  const perEmployeeAmount = selectedEmployees.length > 0 ? totalAmount / selectedEmployees.length : 0

  const autoSummary = buildDepartmentReportSummary(department, values)

  function toggleEmployee(employeeId) {
    setSelectedEmployeeIds((current) => {
      if (current.includes(employeeId)) return current.filter((id) => id !== employeeId)
      return [...current, employeeId]
    })
  }

  function handleChange(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function resetForm() {
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    setSelectedEmployeeIds(defaultId ? [defaultId] : [])
    setSubmissionError('')
    setValues(buildInitialValues(spec, department))
    setTargetDepartment(nextDepartmentOptions.length === 1 ? nextDepartmentOptions[0] : '')
    setPhotos(EMPTY_PHOTOS)
    setPhotoPreview(EMPTY_PHOTOS)
    setExtraSlotKeys([])
    setReviewPayloads(null)
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (selectedEmployees.length === 0 || isSubmitting) return

    if (!product) {
      setSubmissionError('Please select a product.')
      return
    }

    if (quantity <= 0) {
      setSubmissionError('Please enter a quantity greater than zero.')
      return
    }

    if (!hasRate) {
      setSubmissionError(`No rate is configured for ${spec.department} • ${product || 'this product'}. Ask GM to add one in Rate Management.`)
      return
    }

    if (nextDepartmentOptions.length > 1 && !targetDepartment) {
      setSubmissionError('Please choose which department this report is heading to next.')
      return
    }

    const missingAngles = FIXED_PHOTO_SLOTS.filter((slot) => !photoPreview[slot.key]).map((slot) => slot.label)
    if (missingAngles.length > 0) {
      setSubmissionError(`Please upload a ${missingAngles.join(', ')} photo before submitting.`)
      return
    }

    const batchId = `DRB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const batchCapturedAt = new Date().toISOString()
    const itemDepartment = String(department || spec.department || '').trim()
    const resolvedTargetDepartment = nextDepartmentOptions.length === 0 ? '' : (targetDepartment || nextDepartmentOptions[0] || '')

    const payloads = selectedEmployees.map((employee) => ({
      employeeId: String(employee.employeeId || employee.id || employee.identifier || '').trim(),
      employeeName: String(employee.employeeName || employee.name || employee.fullName || '').trim(),
      department: itemDepartment,
      targetDepartment: resolvedTargetDepartment || undefined,
      product,
      quantity,
      pricePerUnit,
      amount: perEmployeeAmount,
      qrFields: values,
      qrSummary: autoSummary,
      scanCapturedAt: batchCapturedAt,
      batchId,
      batchCapturedAt,
      batchItemCount: selectedEmployees.length,
      photos: { ...photoPreview },
      notes: autoSummary,
    }))

    if (payloads.some((payload) => !payload.department)) {
      setSubmissionError('Selected item data is incomplete. Please provide a department.')
      return
    }

    setSubmissionError('')
    setReviewPayloads(payloads)
  }

  function confirmSubmit() {
    if (!reviewPayloads || isSubmitting) return
    setIsSubmitting(true)
    setSubmissionError('')

    Promise.resolve(onSubmit(reviewPayloads)).then(() => {
      setIsSubmitting(false)
      resetForm()
    }).catch((error) => {
      setIsSubmitting(false)
      setSubmissionError(error?.message || 'Failed to submit. Please check your connection and try again.')
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 flex flex-col items-center gap-3">
        <p className="text-sm text-zinc-700">View employees deployed to this department to check who is involved in the report.</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowEmployeeTable(true)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20">
            View employees in department
          </button>
          <div className="text-sm text-zinc-700">Employee/s: <span className="font-semibold text-emerald-700">{selectedEmployeeIds.length}</span></div>
        </div>
      </div>

      {submissionError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700">{submissionError}</div>
      ) : null}

      <div>
        <label className="text-sm text-zinc-700">Product / Size</label>
        <select
          value={values.product || ''}
          onChange={(e) => handleChange('product', e.target.value)}
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Select product</option>
          {departmentRates.map((rate) => (
            <option key={rate.id} value={rate.product}>{rate.product}</option>
          ))}
        </select>
        {departmentRates.length === 0 ? (
          <p className="mt-1 text-xs text-rose-600">No rates configured for {spec.department} yet. Ask GM to add one in Rate Management.</p>
        ) : null}
      </div>

      <div>
        <label className="text-sm text-zinc-700">Quantity</label>
        <input
          type="number"
          min="0"
          value={values.quantity || ''}
          onChange={(e) => handleChange('quantity', e.target.value)}
          placeholder="e.g. 100"
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {nextDepartmentOptions.length > 1 ? (
        <div>
          <label className="text-sm text-zinc-700">Send to next department</label>
          <select
            value={targetDepartment}
            onChange={(e) => setTargetDepartment(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">Select next department</option>
            {nextDepartmentOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label className="text-sm text-zinc-700">Date</label>
        <input
          value={values.date || ''}
          readOnly
          className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-900 cursor-not-allowed"
        />
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
        {hasRate ? (
          <p>
            Rate: ₱{pricePerUnit.toLocaleString()} per unit · Total: <span className="font-semibold">₱{totalAmount.toLocaleString()}</span>
            {selectedEmployees.length > 0 ? (
              <> · ₱{perEmployeeAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} each for {selectedEmployees.length} employee{selectedEmployees.length === 1 ? '' : 's'}</>
            ) : (
              <> · select employees to see each share</>
            )}
          </p>
        ) : (
          <p className="text-emerald-900/70">Pick a department and product to see the rate and computed total.</p>
        )}
      </div>

      <div className="border-t border-zinc-200 pt-4">
        <h4 className="text-sm font-semibold text-zinc-900 mb-4">Work Verification Photos (Front, Back, Left &amp; Right required)</h4>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {photoSlots.map((slot) => {
            const photoKey = slot.key
            return (
              <div key={photoKey} className="flex w-32 shrink-0 flex-col">
                <label className="text-xs text-zinc-500 mb-2 truncate">{slot.label}</label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoChange(photoKey, e.target.files?.[0] || null)}
                  className="hidden"
                  id={`photo-camera-${photoKey}`}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(photoKey, e.target.files?.[0] || null)}
                  className="hidden"
                  id={`photo-gallery-${photoKey}`}
                />
                {photoPreview[photoKey] ? (
                  <div className="relative w-32 h-24 rounded-xl overflow-hidden border-2 border-zinc-300">
                    <img src={photoPreview[photoKey]} alt={`${slot.label} preview`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => (slot.removable ? removePhotoSlot(photoKey) : handlePhotoChange(photoKey, null))}
                      className="absolute top-1 right-1 bg-rose-500 rounded-full p-1 text-white hover:bg-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative w-32 h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-3">
                    {slot.removable ? (
                      <button
                        type="button"
                        onClick={() => removePhotoSlot(photoKey)}
                        className="absolute top-1 right-1 rounded-full bg-zinc-200 p-1 text-zinc-600 hover:bg-zinc-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : null}
                    <label htmlFor={`photo-camera-${photoKey}`} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors">
                      <Camera className="w-3.5 h-3.5" /> Take photo
                    </label>
                    <label htmlFor={`photo-gallery-${photoKey}`} className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-600 hover:border-emerald-500/50 hover:text-zinc-900 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5" /> Gallery
                    </label>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex w-32 shrink-0 flex-col">
            <label className="text-xs text-zinc-500 mb-2">&nbsp;</label>
            <button
              type="button"
              onClick={addPhotoSlot}
              className="flex w-32 h-24 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 text-emerald-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50"
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs font-semibold">Add photo</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4">
        <Button type="button" variant="secondary" onClick={resetForm}>
          Reset
        </Button>
        <Button type="submit" disabled={selectedEmployees.length === 0 || isSubmitting}>
          {isSubmitting ? 'Recording…' : submitLabel}
        </Button>
      </div>

      <EmployeePickerModal
        open={showEmployeeTable}
        department={department}
        employeeOptions={validEmployeeOptions}
        selectedEmployeeIds={selectedEmployeeIds}
        onToggleEmployee={toggleEmployee}
        onClose={() => setShowEmployeeTable(false)}
      />

      <ReportReviewModal
        open={Boolean(reviewPayloads)}
        department={spec.department}
        product={product}
        quantity={quantity}
        pricePerUnit={pricePerUnit || 0}
        totalAmount={totalAmount}
        perEmployeeAmount={perEmployeeAmount}
        payloads={reviewPayloads || []}
        isSubmitting={isSubmitting}
        submissionError={submissionError}
        onConfirm={confirmSubmit}
        onBack={() => setReviewPayloads(null)}
      />
    </form>
  )
}
