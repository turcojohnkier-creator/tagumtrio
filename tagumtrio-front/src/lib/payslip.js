import { PAY_WEEK_START_DAY } from '../constants/payslip'
import { addDays, endOfPayWeek, formatDateKey, formatPayPeriod, parseDateKey, startOfPayWeek } from './datetime'

function workDateKey(report) {
  return String(report?.reportDate || '').slice(0, 10)
}

// "1,450.00" — payslip amounts always show two decimals, like the paper slip.
export function formatPayAmount(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Group an employee's GM-approved report entries into Thursday–Wednesday pay
 * weeks by work date. `reports` come from the history endpoint, which already
 * trims each report's entries down to this employee's own rows.
 */
export function groupPayslipWeeks(reports = [], employeeId = null) {
  const weeks = new Map()
  ;(Array.isArray(reports) ? reports : []).forEach((report) => {
    if (String(report?.status || '').toLowerCase() !== 'approved') return
    const dayKey = workDateKey(report)
    if (!parseDateKey(dayKey)) return
    const start = startOfPayWeek(dayKey, PAY_WEEK_START_DAY)

    const entries = (Array.isArray(report.entries) ? report.entries : [])
      .filter((entry) => employeeId == null || String(entry.employeeId) === String(employeeId))
      .map((entry) => ({ ...entry, workDate: dayKey, reportId: report.id, reportDepartment: report.department }))
    if (entries.length === 0) return

    if (!weeks.has(start)) weeks.set(start, { key: start, entries: [] })
    weeks.get(start).entries.push(...entries)
  })

  return Array.from(weeks.values())
    .map((week) => {
      const pakyawan = week.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      return {
        ...week,
        end: endOfPayWeek(week.key, PAY_WEEK_START_DAY),
        label: `${formatDateKey(week.key, 'monthDay')} – ${formatDateKey(endOfPayWeek(week.key, PAY_WEEK_START_DAY), 'monthDay')}, ${week.key.slice(0, 4)}`,
        period: formatPayPeriod(week.key),
        pakyawan,
        daysWorked: new Set(week.entries.map((entry) => entry.workDate)).size,
      }
    })
    .sort((a, b) => (a.key < b.key ? 1 : -1))
}

/**
 * Everything the printed payslip shows for one pay week. Only PAKYAWAN is
 * tracked by the system; basic pay, OT, holidays and deductions are not yet
 * (per adviser), so they're null and print as "-". Gross = net = pakyawan.
 */
export function buildPayslip(week) {
  const start = week?.key
  const byDay = new Map()
  ;(week?.entries || []).forEach((entry) => {
    byDay.set(entry.workDate, (byDay.get(entry.workDate) || 0) + Number(entry.amount || 0))
  })

  const days = start
    ? Array.from({ length: 7 }, (_, index) => {
      const key = addDays(start, index)
      return { key, amount: byDay.get(key) || 0, isSunday: parseDateKey(key).getUTCDay() === 0 }
    })
    : []

  const pakyawan = days.reduce((sum, day) => sum + day.amount, 0)
  const totalDeductions = 0

  return {
    period: start ? formatPayPeriod(start) : '',
    days,
    dailyRate: null,
    numberOfDays: null,
    basicPay: null,
    pakyawan,
    gross: pakyawan,
    totalDeductions,
    net: pakyawan - totalDeductions,
  }
}

// "Juan Dela Cruz" -> "DELA CRUZ, JUAN" isn't safely derivable from a single
// name field, so: last word is the surname ("CRUZ, JUAN DELA") when there are
// 2+ words; a single word is just uppercased.
export function formatPayslipName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2) return parts.join(' ').toUpperCase()
  const last = parts[parts.length - 1]
  return `${last}, ${parts.slice(0, -1).join(' ')}`.toUpperCase()
}
