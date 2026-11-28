import { buildDepartmentReportSummary } from '../../constants/department-report-fields'

// Turns one Create Report payload (one employee's share) into the entry shape
// stored on a daily report. Shared by the leadman's Create Report page, which
// submits straight to the server, and the app-data draft helper.
export function buildReportEntry(record) {
  const rawEmployeeId = record.employeeId ?? record.id ?? record.employee_id ?? record.identifier ?? record.raw?.employeeId ?? record.raw?.employee_id ?? ''
  let employeeId = Number(rawEmployeeId)
  if (Number.isNaN(employeeId)) employeeId = undefined
  const employeeName = String(record.employeeName || record.name || record.employee_name || record.fullName || record.raw?.employeeName || record.raw?.employee_name || '').trim()
  const department = String(record.department || record.dept || record.raw?.department || '').trim()
  const id = `RPT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const capturedAt = record.scanCapturedAt || record.scannedAt || new Date().toISOString()
  const reportFields = record.qrFields || {}
  const batchId = String(record.batchId || record.raw?.batchId || id)
  const batchCapturedAt = record.batchCapturedAt || record.raw?.batchCapturedAt || capturedAt
  const batchEmployeeCount = Number(record.batchEmployeeCount || record.raw?.batchEmployeeCount || 1)
  const notes = record.notes || buildDepartmentReportSummary(department, reportFields) || null
  const product = String(record.product || '').trim()
  const quantity = Number(record.quantity || 0)
  const pricePerUnit = Number(record.pricePerUnit || 0)
  const amount = Number(record.amount || 0)
  const targetDepartment = String(record.targetDepartment || '').trim()
  const photos = record.photos || {}

  return {
    id,
    batchId,
    batchCapturedAt,
    batchEmployeeCount,
    employeeId,
    employeeName,
    department,
    targetDepartment,
    scannedAt: capturedAt,
    date: reportFields.date || undefined,
    product,
    quantity,
    pricePerUnit,
    amount,
    photos,
    raw: {
      ...(record.raw || {}),
      department,
      employeeId,
      employeeName,
      product,
      quantity,
      pricePerUnit,
      targetDepartment,
      reportFields,
      reportSummary: record.qrSummary || notes,
      capturedAt,
      batchId,
      batchCapturedAt,
      batchEmployeeCount,
    },
    notes,
  }
}
