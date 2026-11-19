// Kept in sync with ARCHIVE_RETENTION_DAYS in tagumtrio-back's
// app/api/v1/endpoints/users.py — the backend is the source of truth for the
// actual purge, this is only used to show a "days left" countdown.
export const ARCHIVE_RETENTION_DAYS = 90

export function daysUntilPurge(archivedAt) {
  if (!archivedAt) return null
  const archivedDate = new Date(archivedAt)
  if (Number.isNaN(archivedDate.getTime())) return null
  const elapsedDays = Math.floor((Date.now() - archivedDate.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, ARCHIVE_RETENTION_DAYS - elapsedDays)
}
