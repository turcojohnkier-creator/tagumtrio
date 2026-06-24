import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Portal from '../../../shared/ui/Portal'
import { buildDepartmentQrSummary, getDepartmentQrScanSpec } from '../../../constants/qr-scan-fields'

function normalizeEmployeeId(employee) {
  return String(employee.employeeId || employee.id || employee.identifier || '').trim()
}

function buildInitialValues(spec, department) {
  return spec.fields.reduce((accumulator, field) => {
    if (field.key === 'department') {
      accumulator[field.key] = department || ''
      return accumulator
    }

    if (field.type === 'date') {
      accumulator[field.key] = new Date().toISOString().slice(0, 10)
      return accumulator
    }

    if (field.type === 'datetime-local') {
      const now = new Date()
      const pad = (value) => String(value).padStart(2, '0')
      accumulator[field.key] = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
      return accumulator
    }

    accumulator[field.key] = ''
    return accumulator
  }, {})
}

function EmployeePickerModal({ open, department, employeeOptions, selectedEmployeeIds, onToggleEmployee, onClose }) {
  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Employees Included</h4>
              <p className="text-sm text-slate-500">Select the employees that belong in this scan.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-800 transition-colors hover:bg-slate-100">
              Close
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Select</th>
                  <th className="px-4 py-3 text-left font-medium">Employee No.</th>
                  <th className="px-4 py-3 text-left font-medium">Employee Name</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
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
                          className="h-4 w-4 rounded border-slate-300 bg-white text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3 align-middle font-medium text-slate-900">{employeeId}</td>
                      <td className="px-4 py-3 align-middle">{employee.employeeName || employee.name || employee.fullName}</td>
                      <td className="px-4 py-3 align-middle text-slate-700">{employee.department || department || employee.dept}</td>
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

export default function DepartmentScanModal({
  open,
  department,
  employeeOptions = [],
  initialEmployeeId = '',
  initialHours = 8,
  allowManualEntry = true,
  title = 'Create Report',
  description = 'Select employees and fill in the department report details before submitting.',
  submitLabel = 'Create Report',
  onClose,
  onSubmit,
}) {
  const spec = useMemo(() => getDepartmentQrScanSpec(department), [department])

  const validEmployeeOptions = useMemo(() => {
    return employeeOptions
      .map((employee) => ({
        ...employee,
        normalizedEmployeeId: normalizeEmployeeId(employee),
      }))
      .filter((employee) => employee.normalizedEmployeeId && (employee.employeeName || employee.name || employee.fullName))
  }, [employeeOptions])

  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => {
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    return defaultId ? [defaultId] : []
  })
  const [showEmployeeTable, setShowEmployeeTable] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [values, setValues] = useState(() => buildInitialValues(spec, department))
  const [manualEmployees, setManualEmployees] = useState(() => [{ productId: '', productName: '', thickness: '', pieces: '', department: department || '' }])
  const [photos, setPhotos] = useState({ photo1: null, photo2: null, photo3: null, photo4: null })
  const [photoPreview, setPhotoPreview] = useState({ photo1: null, photo2: null, photo3: null, photo4: null })

  function handlePhotoChange(photoIndex, file) {
    if (!file) {
      setPhotos((current) => ({ ...current, [photoIndex]: null }))
      setPhotoPreview((current) => ({ ...current, [photoIndex]: null }))
      return
    }

    // Only accept image files
    if (!file.type.startsWith('image/')) {
      setSubmissionError('Please upload only image files.')
      return
    }

    // Store file and create preview
    setPhotos((current) => ({ ...current, [photoIndex]: file }))
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview((current) => ({ ...current, [photoIndex]: e.target.result }))
    }
    reader.readAsDataURL(file)
    setSubmissionError('')
  }

  useEffect(() => {
    // Initialize modal state only when it is opened. Do not overwrite user selection while open.
    if (!open) return
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    setSelectedEmployeeIds((current) => (Array.isArray(current) && current.length > 0 ? current : defaultId ? [defaultId] : []))
    setShowEmployeeTable(false)
    setSubmissionError('')
    setIsSubmitting(false)
    setValues(buildInitialValues(spec, department))
    setManualEmployees([{ productId: '', productName: '', thickness: '', pieces: '', department: department || '' }])
    setPhotos({ photo1: null, photo2: null, photo3: null, photo4: null })
    setPhotoPreview({ photo1: null, photo2: null, photo3: null, photo4: null })
  }, [open])

  const selectedEmployees = validEmployeeOptions.filter((employee) => selectedEmployeeIds.includes(employee.normalizedEmployeeId))
  const submissionEmployees = selectedEmployees.map((employee) => ({
    employeeId: String(employee.employeeId || employee.id || employee.identifier || '').trim(),
    employeeName: String(employee.employeeName || employee.name || employee.fullName || '').trim(),
    productId: String(employee.productId || '').trim(),
    productName: String(employee.productName || '').trim(),
    thickness: employee.thickness || '',
    pieces: Number(employee.pieces || 0),
    department: String(employee.department || department || employee.dept || '').trim(),
  }))

  const autoSummary = buildDepartmentQrSummary(department, values)

  function toggleEmployee(employeeId) {
    setSelectedEmployeeIds((current) => {
      if (current.includes(employeeId)) return current.filter((id) => id !== employeeId)
      return [...current, employeeId]
    })
  }

  function handleChange(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateManualEmployee(rowIndex, key, value) {
    setManualEmployees((current) => current.map((employee, index) => (index === rowIndex ? { ...employee, [key]: value } : employee)))
  }

  function addManualEmployee() {
    setManualEmployees((current) => [...current, { productId: '', productName: '', thickness: '', pieces: '', department: department || '' }])
  }

  function removeManualEmployee(rowIndex) {
    setManualEmployees((current) => {
      const next = current.filter((_, index) => index !== rowIndex)
      return next.length > 0 ? next : [{ productId: '', productName: '', thickness: '', pieces: '', department: department || '' }]
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (submissionEmployees.length === 0 || isSubmitting) return

    // Check if at least one photo is uploaded
    const uploadedPhotos = Object.values(photos).filter(Boolean)
    if (uploadedPhotos.length === 0) {
      setSubmissionError('Please upload at least one work verification photo.')
      return
    }

    const batchId = `DRB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const batchCapturedAt = new Date().toISOString()

    const payloads = submissionEmployees.map((item) => {
      const productId = String(item.productId || item.productId || '').trim()
      const productName = String(item.productName || item.productName || '').trim()
      const thickness = item.thickness || ''
      const pieces = Number(item.pieces || 0)
      const itemDepartment = String(item.department || department || '').trim()

      return {
        employeeId: item.employeeId || null,
        employeeName: item.employeeName || null,
        productId,
        productName,
        thickness,
        pieces,
        department: itemDepartment,
        qrFields: values,
        qrSummary: autoSummary,
        scanCapturedAt: batchCapturedAt,
        batchId,
        batchCapturedAt,
        batchItemCount: submissionEmployees.length,
        photos: {
          photo1: photos.photo1 || null,
          photo2: photos.photo2 || null,
          photo3: photos.photo3 || null,
          photo4: photos.photo4 || null,
        },
        raw: {
          employeeId: item.employeeId || null,
          employeeName: item.employeeName || null,
          batchCapturedAt,
          batchItemCount: submissionEmployees.length,
        },
        notes: autoSummary,
      }
    })

    // Require only the department (product ID is not necessary)
    if (payloads.some((payload) => !payload.department)) {
      setSubmissionError('Selected item data is incomplete. Please provide a department.')
      return
    }

    setIsSubmitting(true)
    setSubmissionError('')
    onSubmit(payloads)
  }

  if (!open) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <form onSubmit={handleSubmit} className="relative w-full max-w-full sm:max-w-md md:max-w-2xl lg:max-w-3xl xl:max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-auto">
          <button type="button" onClick={onClose} className="absolute right-5 top-5 text-slate-500 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>

          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 flex flex-col items-center gap-3">
              <p className="text-sm text-slate-700">View employees deployed to this department to check who is involved in the report.</p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setShowEmployeeTable(true)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20">
                  View employees in department
                </button>
                <div className="text-sm text-slate-700">Employee/s: <span className="font-semibold text-emerald-700">{selectedEmployeeIds.length}</span></div>
              </div>
            </div>

            {submissionError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-700">{submissionError}</div>
            ) : null}

            {spec.fields
              .filter((field) => !field.auto && field.key !== 'department')
              .map((field) => (
                <div key={field.key}>
                  <label className="text-sm text-slate-700">{field.label}</label>
                  <input
                    value={values[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder || ''}
                    readOnly={field.type === 'date' || field.key === 'date'}
                    className={`mt-2 w-full rounded-xl border border-slate-200 ${field.type === 'date' || field.key === 'date' ? 'bg-slate-50 cursor-not-allowed' : 'bg-white'} px-3 py-2.5 text-slate-900 focus:border-emerald-500 focus:outline-none`}
                  />
                </div>
              ))}

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Work Verification Photos (Required)</h4>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => {
                  const photoKey = `photo${num}`
                  return (
                    <div key={photoKey} className="flex flex-col">
                      <label className="text-xs text-slate-500 mb-2">Photo {num}</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(photoKey, e.target.files?.[0] || null)}
                        className="hidden"
                        id={`photo-${num}`}
                      />
                      <label htmlFor={`photo-${num}`} className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-3 cursor-pointer hover:border-emerald-500/50 hover:bg-white transition-colors">
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
                              className="absolute top-1 right-1 bg-rose-500 rounded-full p-1 text-slate-900 hover:bg-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="text-2xl mb-1">📷</div>
                            <div className="text-xs text-slate-500">Upload photo</div>
                          </div>
                        )}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Preview removed per request; count shown in manual section header */}
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-100 px-4 py-2.5 text-slate-800 transition-colors hover:bg-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={submissionEmployees.length === 0 || isSubmitting} className="rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50">
              {isSubmitting ? 'Recording…' : submitLabel}
            </button>
          </div>
        </form>

        <EmployeePickerModal
          open={showEmployeeTable}
          department={department}
          employeeOptions={validEmployeeOptions}
          selectedEmployeeIds={selectedEmployeeIds}
          onToggleEmployee={toggleEmployee}
          onClose={() => setShowEmployeeTable(false)}
        />
      </div>
    </Portal>
  )
}