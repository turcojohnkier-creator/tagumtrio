const COMMON_AUTO_FIELDS = []

const FIELD_SETS = {
  Sundry: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'dateIn', label: 'Date in', type: 'datetime-local', placeholder: 'Date in' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'tent', label: 'Tent', type: 'text', placeholder: 'Tent' },
    { key: 'cratePieces', label: 'Crates/Pieces', type: 'text', placeholder: 'Crates/Pieces' },
    { key: 'dateHarvest', label: 'Date Harvest', type: 'date', placeholder: 'Date Harvest' },
  ],
  Repair: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'crates', label: 'Crates', type: 'text', placeholder: 'Crates' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Packing: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'crates', label: 'Crates', type: 'text', placeholder: 'Crates' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Spreader: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'crates', label: 'Crates', type: 'text', placeholder: 'Crates' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Veneering: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  'Core Builder': [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'crates', label: 'Crates', type: 'text', placeholder: 'Crates' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Classifying: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Putty: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Sizer: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Rotary: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Sorting: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Hotpress: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
  Assembly: [
    { key: 'department', label: 'Department', type: 'text', placeholder: 'Department' },
    { key: 'thickness', label: 'Thickness', type: 'text', placeholder: 'Thickness' },
    { key: 'cratePieces', label: 'Crate/Pieces', type: 'text', placeholder: 'Crate/Pieces' },
    { key: 'date', label: 'Date', type: 'date', placeholder: 'Date' },
  ],
}

const ALIASES = {
  'Packing/Classifying': 'Packing',
  Spreadersizer: 'Spreader',
  Hotpress: 'Hotpress',
  'Hot Press': 'Hotpress',
  'Core builder': 'Core Builder',
  packing: 'Packing',
  spreader: 'Spreader',
  hotpress: 'Hotpress',
  'core builder': 'Core Builder',
  classifying: 'Classifying',
  rotary: 'Rotary',
  sizer: 'Sizer',
  assembly: 'Assembly',
  repair: 'Repair',
  sorting: 'Sorting',
  putty: 'Putty',
  veneering: 'Veneering',
  sundry: 'Sundry',
}

function toLocalDateTimeValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const pad = (input) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toLocalDateValue(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  const pad = (input) => String(input).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function normalizeDepartmentName(department) {
  return ALIASES[department] || department || 'Sundry'
}

export function getDepartmentQrScanSpec(department) {
  const resolvedDepartment = normalizeDepartmentName(department)
  const fields = FIELD_SETS[resolvedDepartment] || FIELD_SETS.Sundry
  return {
    department: resolvedDepartment,
    label: resolvedDepartment,
    fields: [...COMMON_AUTO_FIELDS, ...fields],
  }
}

export function buildDepartmentQrScanDefaults(department) {
  return getDepartmentQrScanSpec(department).fields.reduce((accumulator, field) => {
    if (field.type === 'date') {
      accumulator[field.key] = toLocalDateValue()
      return accumulator
    }

    if (field.type === 'datetime-local') {
      accumulator[field.key] = toLocalDateTimeValue()
      return accumulator
    }

    accumulator[field.key] = ''
    return accumulator
  }, {})
}

export function buildDepartmentQrSummary(department, values = {}) {
  const spec = getDepartmentQrScanSpec(department)
  return spec.fields
    .map((field) => {
      const value = values[field.key]
      if (value === undefined || value === null || value === '') return null
      return `${field.label}: ${value}`
    })
    .filter(Boolean)
    .join(' | ')
}
