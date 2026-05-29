import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import Portal from '../ui/Portal'
import { buildDepartmentQrSummary, getDepartmentQrScanSpec } from '../../constants/qr-scan-fields'

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
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 px-5 py-4">
            <div>
              <h4 className="text-base font-semibold text-white">Employees Included</h4>
              <p className="text-sm text-slate-400">Select the employees that belong in this scan.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-800">
              Close
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="sticky top-0 bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Select</th>
                  <th className="px-4 py-3 text-left font-medium">Employee No.</th>
                  <th className="px-4 py-3 text-left font-medium">Employee Name</th>
                  <th className="px-4 py-3 text-left font-medium">Department</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
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
                          className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-4 py-3 align-middle font-medium text-white">{employeeId}</td>
                      <td className="px-4 py-3 align-middle">{employee.employeeName || employee.name || employee.fullName}</td>
                      <td className="px-4 py-3 align-middle text-slate-300">{employee.department || department || employee.dept}</td>
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
  title = 'Scan Employee QR',
  description = 'Select employees and fill in the department scan details before recording the scan.',
  submitLabel = 'Submit Scan',
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

  const [entryMode, setEntryMode] = useState(validEmployeeOptions.length > 0 ? 'scan' : 'manual')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => {
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    return defaultId ? [defaultId] : []
  })
  const [showEmployeeTable, setShowEmployeeTable] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState('')
  const [values, setValues] = useState(() => buildInitialValues(spec, department))
  const [manualEmployees, setManualEmployees] = useState(() => [{ productId: '', productName: '', thickness: '', pieces: '', department: department || '' }])

  useEffect(() => {
    // Initialize modal state only when it is opened. Do not overwrite user selection while open.
    if (!open) return
    const defaultId = normalizeEmployeeId({ employeeId: initialEmployeeId }) || validEmployeeOptions[0]?.normalizedEmployeeId
    setEntryMode(validEmployeeOptions.length > 0 ? 'scan' : 'manual')
    setSelectedEmployeeIds((current) => (Array.isArray(current) && current.length > 0 ? current : defaultId ? [defaultId] : []))
    setShowEmployeeTable(false)
    setSubmissionError('')
    setIsSubmitting(false)
    setValues(buildInitialValues(spec, department))
    setManualEmployees([{ productId: '', productName: '', thickness: '', pieces: '', department: department || '' }])
  }, [open])

  const selectedEmployees = validEmployeeOptions.filter((employee) => selectedEmployeeIds.includes(employee.normalizedEmployeeId))
  const manualSubmissionEmployees = useMemo(() => {
    return manualEmployees
      .map((item) => ({
        productId: String(item.productId || '').trim(),
        productName: String(item.productName || '').trim(),
        thickness: String(item.thickness || '').trim(),
        pieces: Number(item.pieces || 0),
        department: String(item.department || department || '').trim(),
      }))
      .filter((item) => item.productId || item.productName || item.department)
  }, [department, manualEmployees])

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

    const batchId = `DRB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const batchCapturedAt = new Date().toISOString()

    const payloads = submissionEmployees.map((item) => {
      const productId = String(item.productId || item.productId || '').trim()
      const productName = String(item.productName || item.productName || '').trim()
      const thickness = item.thickness || ''
      const pieces = Number(item.pieces || 0)
      const itemDepartment = String(item.department || department || '').trim()

      return {
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
        raw: {
          department: itemDepartment,
          productId,
          productName,
          thickness,
          pieces,
          qrFields: values,
          qrSummary: autoSummary,
          batchId,
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
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
        <form onSubmit={handleSubmit} className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <button type="button" onClick={onClose} className="absolute right-5 top-5 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>

          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button type="button" onClick={() => setEntryMode('scan')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${entryMode === 'scan' ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:bg-slate-900'}`}>
                QR scan mode
              </button>
              <button type="button" onClick={() => setEntryMode('manual')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${entryMode === 'manual' ? 'bg-emerald-500 text-black' : 'text-slate-300 hover:bg-slate-900'}`}>
                Manual entry
              </button>
            </div>
            </div>

            {submissionError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{submissionError}</div>
            ) : null}

            {entryMode === 'scan' ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 flex justify-center">
                <div className="relative w-full max-w-[960px]">
                  <div className="aspect-square rounded-lg border-2 border-dashed border-slate-700 bg-slate-900 flex items-center justify-center">
                    <div className="text-center text-slate-400">Scanner placeholder (camera view)</div>
                  </div>
                
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 flex flex-col items-center gap-3">
                <p className="text-sm text-slate-300">View employees deployed to this department to check who is involved in the scan.</p>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShowEmployeeTable(true)} className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20">
                    View employees in department
                  </button>
                  <div className="text-sm text-slate-300">Employee/s: <span className="font-semibold text-emerald-300">{selectedEmployeeIds.length}</span></div>
                </div>
              </div>
            )}

            {entryMode === 'manual' ? (
              <>
                {spec.fields
                  .filter((field) => !field.auto && field.key !== 'department')
                  .map((field) => (
                    <div key={field.key}>
                      <label className="text-sm text-slate-300">{field.label}</label>
                      <input
                        value={values[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        readOnly={field.type === 'date' || field.key === 'date'}
                        className={`mt-2 w-full rounded-xl border border-slate-800 ${field.type === 'date' || field.key === 'date' ? 'bg-slate-950 cursor-not-allowed' : 'bg-slate-900'} px-3 py-2.5 text-white focus:border-emerald-500 focus:outline-none`}
                      />
                    </div>
                  ))}

                {/* Preview removed per request; count shown in manual tab header */}
              </>
            ) : null}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
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