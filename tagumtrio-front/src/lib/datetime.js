const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// "Today" for payroll/salary purposes resets at midnight Philippine time,
// not UTC midnight (which would be 8am PHT) — always compute date keys
// through this so "today" lines up with the business's actual day boundary.
export function toManilaDateKey(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return null
  return MANILA_DATE_FORMATTER.format(date)
}

/* ---------- calendar helpers on "YYYY-MM-DD" date keys ----------
 * All arithmetic runs on UTC midnight so a key never shifts a day because of
 * the viewer's timezone or DST. A date key is just a calendar day.
 */

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})/

export function parseDateKey(key) {
  const match = DATE_KEY_RE.exec(String(key || ''))
  if (!match) return null
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

export function toDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

export function addDays(key, days) {
  const date = parseDateKey(key)
  if (!date) return null
  date.setUTCDate(date.getUTCDate() + days)
  return toDateKey(date)
}

// Clamps to the target month's last day: Jan 31 + 1 month -> Feb 28/29.
export function addMonths(key, months) {
  const date = parseDateKey(key)
  if (!date) return null
  const day = date.getUTCDate()
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day, lastDay))
  return toDateKey(target)
}

// Weeks run Sunday–Saturday, matching the calendar grid.
export function startOfWeek(key) {
  const date = parseDateKey(key)
  if (!date) return null
  return addDays(key, -date.getUTCDay())
}

export function endOfWeek(key) {
  const start = startOfWeek(key)
  return start ? addDays(start, 6) : null
}

export function startOfMonth(key) {
  const date = parseDateKey(key)
  if (!date) return null
  return toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)))
}

export function endOfMonth(key) {
  const date = parseDateKey(key)
  if (!date) return null
  return toDateKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)))
}

export function getRange(mode, anchorKey) {
  if (mode === 'week') return { start: startOfWeek(anchorKey), end: endOfWeek(anchorKey) }
  if (mode === 'month') return { start: startOfMonth(anchorKey), end: endOfMonth(anchorKey) }
  return { start: anchorKey, end: anchorKey }
}

// Step the anchor by one unit of the current mode.
export function shiftAnchor(mode, anchorKey, direction) {
  if (mode === 'week') return addDays(anchorKey, 7 * direction)
  if (mode === 'month') return addMonths(anchorKey, direction)
  return addDays(anchorKey, direction)
}

// 6 rows × 7 days covering the anchor's month, padded with neighbouring days.
export function buildMonthGrid(anchorKey) {
  const gridStart = startOfWeek(startOfMonth(anchorKey))
  return Array.from({ length: 6 }, (_, row) => (
    Array.from({ length: 7 }, (_, col) => addDays(gridStart, row * 7 + col))
  ))
}

const UTC_FORMAT = (options) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options })
const FMT_LONG_DAY = UTC_FORMAT({ weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
const FMT_SHORT_DAY = UTC_FORMAT({ weekday: 'short', month: 'short', day: 'numeric' })
const FMT_MONTH_DAY = UTC_FORMAT({ month: 'short', day: 'numeric' })
const FMT_MONTH_YEAR = UTC_FORMAT({ month: 'long', year: 'numeric' })

export function formatDateKey(key, style = 'long') {
  const date = parseDateKey(key)
  if (!date) return String(key || '')
  if (style === 'short') return FMT_SHORT_DAY.format(date)
  if (style === 'monthDay') return FMT_MONTH_DAY.format(date)
  if (style === 'monthYear') return FMT_MONTH_YEAR.format(date)
  return FMT_LONG_DAY.format(date)
}

/* ---------- pay weeks (payslips) ---------- */

// Start of the pay week containing `key`. Weeks start on `startDay`
// (0 = Sunday … 6 = Saturday); the company's pay week is Thursday–Wednesday.
export function startOfPayWeek(key, startDay = 4) {
  const date = parseDateKey(key)
  if (!date) return null
  const offset = (date.getUTCDay() - startDay + 7) % 7
  return addDays(key, -offset)
}

export function endOfPayWeek(key, startDay = 4) {
  const start = startOfPayWeek(key, startDay)
  return start ? addDays(start, 6) : null
}

const FMT_MONTH_UPPER = UTC_FORMAT({ month: 'long' })

// "NOVEMBER 5-11, 2026", or across months "OCTOBER 29 - NOVEMBER 4, 2026",
// or across years "DECEMBER 31, 2026 - JANUARY 6, 2027".
export function formatPayPeriod(startKey) {
  const start = parseDateKey(startKey)
  const end = parseDateKey(addDays(startKey, 6))
  if (!start || !end) return ''
  const month = (d) => FMT_MONTH_UPPER.format(d).toUpperCase()
  if (start.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${month(start)} ${start.getUTCDate()}, ${start.getUTCFullYear()} - ${month(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`
  }
  if (start.getUTCMonth() !== end.getUTCMonth()) {
    return `${month(start)} ${start.getUTCDate()} - ${month(end)} ${end.getUTCDate()}, ${end.getUTCFullYear()}`
  }
  return `${month(start)} ${start.getUTCDate()}-${end.getUTCDate()}, ${end.getUTCFullYear()}`
}

const FMT_SHORT_MONTH = UTC_FORMAT({ month: 'short' })

// "05-Nov" — the per-day rows on the payslip.
export function formatSlipDay(key) {
  const date = parseDateKey(key)
  if (!date) return ''
  return `${String(date.getUTCDate()).padStart(2, '0')}-${FMT_SHORT_MONTH.format(date)}`
}

export function formatRangeLabel(mode, range) {
  if (!range?.start) return ''
  if (mode === 'month') return formatDateKey(range.start, 'monthYear')
  if (mode === 'week') {
    const start = parseDateKey(range.start)
    const end = parseDateKey(range.end)
    const sameMonth = start.getUTCMonth() === end.getUTCMonth()
    const endLabel = sameMonth ? String(end.getUTCDate()) : FMT_MONTH_DAY.format(end)
    return `${FMT_MONTH_DAY.format(start)} – ${endLabel}, ${end.getUTCFullYear()}`
  }
  return formatDateKey(range.start, 'long')
}
