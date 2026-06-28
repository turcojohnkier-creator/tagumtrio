import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Portal from '../../../shared/ui/Portal'
import Button from '../../../shared/ui/Button'
import { useAppData } from '../../../context/app-data-context'
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

const EMPTY_PHOTOS = { photo1: null, photo2: null, photo3: null, photo4: null }

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
                      <td className="px-4 py-3 align-middle font-medium text-zinc-900">{employeeId}</td>
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
  const [values, setValues] = useState(() => buildInitialValues(spec, department, initialValuesOverride))
  const [targetDepartment, setTargetDepartment] = useState(() => initialTargetDepartment || '')
  const [photos, setPhotos] = useState(EMPTY_PHOTOS)
  const [photoPreview, setPhotoPreview] = useState(() => initialPhotoPreview || EMPTY_PHOTOS)

  // Department changed (e.g. leadman switched the selector) — reset the form for the new department.
  useEffect(() => {
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    setSelectedEmployeeIds(defaultId ? [defaultId] : [])
    setShowEmployeeTable(false)
    setSubmissionError('')
    setIsSubmitting(false)
    setValues(buildInitialValues(spec, department))
    setTargetDepartment('')
    setPhotos(EMPTY_PHOTOS)
    setPhotoPreview(EMPTY_PHOTOS)
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
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview((current) => ({ ...current, [photoIndex]: e.target.result }))
    }
    reader.readAsDataURL(file)
    setSubmissionError('')
  }

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

    const uploadedPhotos = Object.values(photoPreview).filter(Boolean)
    if (uploadedPhotos.length === 0) {
      setSubmissionError('Please upload at least one work verification photo.')
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
      photos: {
        photo1: photoPreview.photo1 || null,
        photo2: photoPreview.photo2 || null,
        photo3: photoPreview.photo3 || null,
        photo4: photoPreview.photo4 || null,
      },
      notes: autoSummary,
    }))

    if (payloads.some((payload) => !payload.department)) {
      setSubmissionError('Selected item data is incomplete. Please provide a department.')
      return
    }

    setIsSubmitting(true)
    setSubmissionError('')

    Promise.resolve(onSubmit(payloads)).then(() => {
      setIsSubmitting(false)
      resetForm()
    }).catch(() => {
      setIsSubmitting(false)
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
        <h4 className="text-sm font-semibold text-zinc-900 mb-4">Work Verification Photos (Required)</h4>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((num) => {
            const photoKey = `photo${num}`
            return (
              <div key={photoKey} className="flex flex-col">
                <label className="text-xs text-zinc-500 mb-2">Photo {num}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(photoKey, e.target.files?.[0] || null)}
                  className="hidden"
                  id={`photo-${num}`}
                />
                <label htmlFor={`photo-${num}`} className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-3 cursor-pointer hover:border-emerald-500/50 hover:bg-white transition-colors">
                  {photoPreview[photoKey] ? (
                    <div className="relative w-full h-24 rounded">
                      <img src={photoPreview[photoKey]} alt={`Preview ${num}`} className="w-full h-full object-cover rounded" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handlePhotoChange(photoKey, null)
                        }}
                        className="absolute top-1 right-1 bg-rose-500 rounded-full p-1 text-white hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-2xl mb-1">📷</div>
                      <div className="text-xs text-zinc-500">Upload photo</div>
                    </div>
                  )}
                </label>
              </div>
            )
          })}
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
    </form>
  )
}
