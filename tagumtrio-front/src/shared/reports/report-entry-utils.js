import { formatEmployeeId } from '../../lib/employeeId'

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
  const raw = String(
    entry?.employeeId
    || entry?.raw?.employeeId
    || entry?.raw?.employee_id
    || ''
  ).trim()
  return raw ? formatEmployeeId(raw) : ''
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

// Image URLs for a report's entries, counted once per batch — every worker row
// in a batch carries a copy of the same photos, so a flat per-row count
// multiplied them (7 workers × 5 photos showed as 35).
export function getReportPhotos(entries = []) {
  return summarizeBatches(groupBatches(entries)).photos.map((photo) => photo.src)
}

const PHOTO_ANGLES = [
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
]
const PHOTO_ANGLE_KEYS = new Set(PHOTO_ANGLES.map((angle) => angle.key))

// Normalize an entry's photos (object keyed by angle, array, or legacy url
// lists) into [{ label, src }]. Leadmen can add any number of extra photos
// beyond the 4 fixed angles; those are stored under generated keys
// ("extra-<timestamp>-<rand>") and are labelled Photo 5, Photo 6, ... in the
// order they were added — the same numbering the report form shows.
export function getEntryPhotos(entry) {
  const photos = entry?.photos ?? entry?.raw?.photos
  if (photos && typeof photos === 'object' && !Array.isArray(photos)) {
    const fixed = PHOTO_ANGLES
      .filter((angle) => photos[angle.key])
      .map((angle) => ({ label: angle.label, src: photos[angle.key] }))
    const extras = Object.keys(photos)
      .filter((key) => !PHOTO_ANGLE_KEYS.has(key) && photos[key])
      .map((key, index) => ({ label: `Photo ${PHOTO_ANGLES.length + 1 + index}`, src: photos[key] }))
    return [...fixed, ...extras]
  }
  const list = Array.isArray(photos) ? photos : (entry?.photoUrls || entry?.imageUrls || [])
  return list.filter(Boolean).map((src, index) => ({ label: `Photo ${index + 1}`, src }))
}

// Every worker in a batch carries a copy of the same photo set, so collapse
// those copies — but match on angle AND image, never image alone: the same
// picture uploaded for two angles compresses to an identical data URL, and
// both angles must still show.
function dedupePhotos(photos) {
  const seen = new Set()
  return photos.filter((photo) => {
    const key = `${photo.label}\u0000${photo.src}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// A report holds one entry per worker, and every worker in the same scanned
// batch carries the SAME quantity/product/photos. Group them back into
// batches so quantity is counted once per batch (not once per worker).
export function groupBatches(entries = [], fallbackDepartment = '') {
  const batches = new Map()
  ;(Array.isArray(entries) ? entries : []).filter(hasMeaningfulEntry).forEach((entry, index) => {
    const key = String(entry.batchId || entry.raw?.batchId || entry.id || `row-${index}`)
    if (!batches.has(key)) {
      const pieces = Number(getEntryPieces(entry))
      batches.set(key, {
        key,
        department: entry.department || entry.raw?.department || fallbackDepartment || '',
        product: entry.product || entry.raw?.product || '',
        quantity: Number.isFinite(pieces) ? pieces : 0,
        date: entry.date || entry.qrFields?.date || entry.raw?.qrFields?.date || '',
        amount: 0,
        workers: [],
        photos: [],
      })
    }
    const batch = batches.get(key)
    batch.amount += Number(entry.amount || 0)
    batch.workers.push({
      id: entry.employeeId ?? entry.raw?.employeeId ?? null,
      name: getEntryLabel(entry),
      identifier: getEntryIdentifier(entry),
    })
    batch.photos = dedupePhotos([...batch.photos, ...getEntryPhotos(entry)])
  })
  return Array.from(batches.values())
}

// Report-level totals built from batches.
export function summarizeBatches(batches = []) {
  const workerKeys = new Set()
  batches.forEach((batch) => batch.workers.forEach((w) => workerKeys.add(String(w.id ?? w.name))))
  return {
    totalQuantity: batches.reduce((sum, batch) => sum + batch.quantity, 0),
    totalAmount: batches.reduce((sum, batch) => sum + batch.amount, 0),
    workerCount: workerKeys.size,
    batchCount: batches.length,
    // Each batch is its own delivery with its own photo set — count them all.
    photos: batches.flatMap((batch) => batch.photos),
  }
}

// Report summaries are mostly auto-generated ("Consolidated report • 3 rows •
// 12 crates/pieces • ₱96", or "Department: X | Product / Size: Y | ...").
// Verify/reject notes get appended after " • ". Return only the human-written part.
const AUTO_SUMMARY_SEGMENTS = [
  /^consolidated report$/i,
  /^\d+ rows?$/i,
  /crates\/pieces$/i,
  /^₱[\d,.]+$/,
  /^department:.*\|/i,
]

export function extractNote(summary) {
  return String(summary || '')
    .split(' • ')
    .map((segment) => segment.trim())
    .filter((segment) => segment && !AUTO_SUMMARY_SEGMENTS.some((pattern) => pattern.test(segment)))
    .join(' • ')
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