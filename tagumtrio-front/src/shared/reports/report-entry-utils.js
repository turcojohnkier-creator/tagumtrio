export function getEntryLabel(entry) {
  return String(
    entry?.employeeName
    || entry?.productName
    || entry?.itemName
    || entry?.raw?.employeeName
    || entry?.raw?.employee_name
    || entry?.raw?.name
    || entry?.raw?.productName
    || entry?.raw?.itemName
    || entry?.employeeId
    || entry?.productId
    || entry?.raw?.employeeId
    || entry?.raw?.productId
    || ''
  ).trim()
}

export function getEntryIdentifier(entry) {
  return String(
    entry?.employeeId
    || entry?.productId
    || entry?.raw?.employeeId
    || entry?.raw?.employee_id
    || entry?.raw?.productId
    || entry?.raw?.product_id
    || ''
  ).trim()
}

export function getEntryPieces(entry) {
  const value = entry?.raw?.qrFields?.cratePieces
    ?? entry?.qrFields?.cratePieces
    ?? entry?.raw?.qrFields?.crates
    ?? entry?.qrFields?.crates
    ?? entry?.raw?.qrFields?.pieces
    ?? entry?.qrFields?.pieces
    ?? entry?.cratePieces
    ?? entry?.crates
    ?? entry?.pieces
    ?? ''
  return value === 0 ? 0 : value
}

export function hasMeaningfulEntry(entry) {
  if (!entry || typeof entry !== 'object') return false
  return Boolean(
    getEntryLabel(entry)
    || getEntryIdentifier(entry)
    || entry.department
    || entry.raw?.department
    || entry.raw?.qrFields?.department
    || entry.qrFields?.department
    || entry.thickness
    || entry.raw?.qrFields?.thickness
    || entry.qrFields?.thickness
    || getEntryPieces(entry) !== ''
    || Number(entry.amount || 0) !== 0
    || Number(entry.loggedHours || 0) !== 0
  )
}