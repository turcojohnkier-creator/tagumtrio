import { addDays, parseDateKey } from './datetime'

// Mirrors app/services/leave_service.py: every leave day uses one "attempt".
// 2 per month, and one request covers at most 2 consecutive days.
export const MONTHLY_LEAVE_DAYS = 2
export const MAX_DAYS_PER_REQUEST = 2

// Calendar days a request covers (inclusive). Missing/odd dates count as 1.
export function leaveDays(startDate, endDate) {
  const start = parseDateKey(startDate)
  const end = parseDateKey(endDate) || start
  if (!start || !end || end < start) return 1
  return Math.round((end - start) / 86400000) + 1
}

// The latest end date allowed for a given start: start + 1 day, or the start
// itself when only one leave day is left this month.
export function maxEndDate(startDate, remainingDays) {
  if (!startDate) return ''
  const span = Math.min(MAX_DAYS_PER_REQUEST, Math.max(1, remainingDays))
  return addDays(startDate, span - 1) || startDate
}
