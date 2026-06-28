export function getEntryLabel(entry) {
  return String(
    entry?.employeeName
    || entry?.raw?.employeeName
    || entry?.raw?.employee_name
    || entry?.raw?.name
    || entry?.employeeId
    || entry?.raw?.employeeId
    || ''
  ).trim()
}

export function getEntryIdentifier(entry) {
  return String(
    entry?.employeeId
    || entry?.raw?.employeeId
    || entry?.raw?.employee_id
    || ''
  ).trim()
}

export function getEntryPieces(entry) {
  const value = entry?.quantity
    ?? entry?.raw?.quantity
    ?? entry?.raw?.qrFields?.pieces
    ?? entry?.qrFields?.pieces
    ?? entry?.raw?.qrFields?.cratePieces
    ?? entry?.qrFields?.cratePieces
    ?? entry?.raw?.qrFields?.crates
    ?? entry?.qrFields?.crates
    ?? entry?.cratePieces
    ?? entry?.crates
    ?? entry?.pieces
    ?? ''
  return value === 0 ? 0 : value
}

export function getReportPhotos(entries = []) {
  return (Array.isArray(entries) ? entries : []).flatMap((entry) => {
    if (Array.isArray(entry?.photos)) return entry.photos
    if (entry?.photos && typeof entry.photos === 'object') return Object.values(entry.photos)
    return entry?.photoUrls || entry?.imageUrls || []
  }).filter(Boolean)
}

export function hasMeaningfulEntry(entry) {
  if (!entry || typeof entry !== 'object') return false
  return Boolean(
    getEntryLabel(entry)
    || getEntryIdentifier(entry)
    || entry.department
    || entry.raw?.department
    || entry.product
    || entry.raw?.product
    || getEntryPieces(entry) !== ''
    || Number(entry.amount || 0) !== 0
  )
}