// Employee IDs are plain auto-increment integers end to end (frontend state,
// API calls, backend primary key) — this formats them for DISPLAY ONLY, e.g.
// 17 -> "ttl-00017". Never store or compare against the formatted string;
// keep the underlying id numeric everywhere else (sorting, lookups, API params).
export function formatEmployeeId(id, { prefix = 'TTL', width = 5 } = {}) {
  if (id === null || id === undefined || id === '') return '-'
  const numeric = Number(id)
  // Non-numeric ids (e.g. a login username shown in its place) pass through
  // unchanged rather than being mangled by zero-padding.
  if (!Number.isFinite(numeric)) return String(id)
  return `${prefix}-${String(Math.trunc(Math.abs(numeric))).padStart(width, '0')}`
}
