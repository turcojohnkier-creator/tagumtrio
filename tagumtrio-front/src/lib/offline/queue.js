import Dexie from 'dexie'

const DB_NAME = 'tagumtrio_offline'

const db = new Dexie(DB_NAME)
db.version(1).stores({
  scans: '&id,leadmanId,status,createdAt,updatedAt'
})

export async function enqueueScan(scan) {
  const now = new Date().toISOString()
  const record = {
    id: scan.id,
    leadmanId: scan.leadmanId || scan.leadman_id || null,
    raw: scan.raw || null,
    meta: scan.meta || null,
    scannedAt: scan.scannedAt || now,
    deviceId: scan.deviceId || scan.device_id || null,
    status: scan.status || 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.scans.put(record)
  return record.id
}

export async function getPendingScans(limit = 50) {
  return db.scans.where('status').equals('pending').limit(limit).toArray()
}

export async function markScansUploaded(ids = []) {
  const now = new Date().toISOString()
  return Promise.all(ids.map((id) => db.scans.update(id, { status: 'uploaded', updatedAt: now })))
}

export async function markScanFailed(id, reason) {
  const rec = await db.scans.get(id)
  const attempts = (rec?.attempts || 0) + 1
  const updates = { attempts, updatedAt: new Date().toISOString(), lastError: reason }
  if (attempts >= 5) updates.status = 'error'
  return db.scans.update(id, updates)
}

export async function pendingCount() {
  return db.scans.where('status').equals('pending').count()
}

export async function trySyncOnce(batchSize = 50) {
  const pending = await getPendingScans(batchSize)
  if (!pending.length) return { ok: true, uploaded: 0 }
  return { ok: false, reason: 'backend disabled', uploaded: 0 }
}

export default db
