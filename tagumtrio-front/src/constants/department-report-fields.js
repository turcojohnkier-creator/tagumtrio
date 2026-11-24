import { DEPARTMENTS } from './departments'
import { toManilaDateKey } from '../lib/datetime'

const ALIASES = {
  'Hot Press': 'Hotpress',
  hotpress: 'Hotpress',
  rotary: 'Rotary',
  sorting: 'Sorting',
  assembly: 'Assembly',
  'assembly8.5&10': 'Assembly8.5&10',
  sundry: 'Sundry',
  repair: 'Repair',
  packing: 'Packing',
  'packing/classifying': 'Packing',
  classifying: 'Packing',
  spreader: 'Spreader',
  spreadersizer: 'Spreader',
  'core builder': 'Core Builder',
  putty: 'Putty',
  sizer: 'Sizer',
  sander: 'Sander',
  'sand paper': 'Sand Paper',
  'paint black': 'Paint Black',
  bundle: 'Bundle',
  logo: 'Logo',
}

// Today's date in Philippine time (UTC+8), not the browser's or UTC's.
function toLocalDateValue(value = new Date()) {
  return toManilaDateKey(value)
}

export function normalizeDepartmentName(department) {
  if (!department) return DEPARTMENTS[0]
  if (DEPARTMENTS.includes(department)) return department
  return ALIASES[department] || ALIASES[String(department).toLowerCase()] || department
}

export function getDepartmentReportFieldSpec(department) {
  const resolvedDepartment = normalizeDepartmentName(department)

  const fields = [
    { key: 'department', label: 'Department', type: 'text' },
    { key: 'product', label: 'Product', type: 'select', placeholder: 'Select product' },
    { key: 'quantity', label: 'Quantity', type: 'number', placeholder: 'e.g. 100' },
    { key: 'date', label: 'Date', type: 'date' },
  ]

  return {
    department: resolvedDepartment,
    label: resolvedDepartment,
    fields,
  }
}

export function buildDepartmentReportFieldDefaults(department) {
  return getDepartmentReportFieldSpec(department).fields.reduce((accumulator, field) => {
    if (field.type === 'date') {
      accumulator[field.key] = toLocalDateValue()
      return accumulator
    }
    accumulator[field.key] = ''
    return accumulator
  }, {})
}

export function buildDepartmentReportSummary(department, values = {}) {
  const spec = getDepartmentReportFieldSpec(department)
  return spec.fields
    .map((field) => {
      const value = values[field.key]
      if (value === undefined || value === null || value === '') return null
      return `${field.label}: ${value}`
    })
    .filter(Boolean)
    .join(' | ')
}
