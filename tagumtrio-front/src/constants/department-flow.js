import { normalizeDepartmentName } from './department-report-fields'

// The physical production sequence lumber/plywood moves through. When a
// department has more than one valid next step, the leadman picks the
// destination at submission time. An empty array means the chain ends here
// (e.g. Logo) — those reports skip the next-department verification step.
const NEXT_DEPARTMENTS = {
  Rotary: ['Sundry'],
  Sundry: ['Sorting'],
  Sorting: ['Assembly', 'Core Builder'],
  Assembly: ['Core Builder', 'Repair', 'Spreader', 'Sizer'],
  'Core Builder': ['Assembly', 'Repair', 'Spreader', 'Sizer'],
  Repair: ['Hotpress'],
  Hotpress: ['Putty'],
  Putty: ['Sander', 'Sand Paper'],
  Sander: ['Spreader'],
  Spreader: ['Sizer'],
  Sizer: ['Packing'],
  Packing: ['Putty'],
  'Sand Paper': ['Paint Black'],
  'Paint Black': ['Bundle'],
  Bundle: ['Logo'],
  Logo: [],
  'Assembly8.5&10': [],
}

export function getNextDepartmentOptions(department) {
  const resolved = normalizeDepartmentName(department)
  return NEXT_DEPARTMENTS[resolved] || []
}
