import { useEffect, useMemo, useState } from 'react'
import { MessageSquareWarning, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import DailyReportTable from '../../components/reports/DailyReportTable'
import { useDialog } from '../../context/dialog-context'
import { getEntryIdentifier, getEntryLabel, getEntryPieces, hasMeaningfulEntry } from '../../components/reports/report-entry-utils'

function formatReportDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getFieldValue(entry, key) {
  return entry?.raw?.qrFields?.[key] ?? entry?.qrFields?.[key] ?? entry?.[key] ?? ''
}

function groupReportEntries(entries = []) {
  const groups = new Map()

  entries.filter(hasMeaningfulEntry).forEach((entry, index) => {
    const batchKey = String(entry.batchId || entry.raw?.batchId || entry.id || `${entry.department || 'report'}-${index}`)
    const scannedAt = entry.batchCapturedAt || entry.scannedAt || entry.raw?.batchCapturedAt || entry.raw?.capturedAt || entry.createdAt || entry.reportDate
    const department = String(entry.department || entry.raw?.department || '')
    const thickness = String(getFieldValue(entry, 'thickness') || '')
    const cratesPieces = String(getFieldValue(entry, 'cratePieces') || getFieldValue(entry, 'crates') || '')

    if (!groups.has(batchKey)) {
      groups.set(batchKey, {
        id: batchKey,
        batchId: batchKey,
        department,
        scannedAt,
        thickness,
        cratesPieces,
        entries: [],
      })
    }

    const group = groups.get(batchKey)
    group.entries.push(entry)
    group.department = group.department || department
    group.scannedAt = group.scannedAt || scannedAt
    group.thickness = group.thickness || thickness
    group.cratesPieces = group.cratesPieces || cratesPieces
  })

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      employeeCount: new Set(group.entries.map((entry) => String(getEntryIdentifier(entry) || getEntryLabel(entry) || entry.id || ''))).size,
      totalHours: group.entries.reduce((sum, entry) => sum + Number(entry.loggedHours || 0), 0),
      totalAmount: group.entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    }))
    .sort((a, b) => new Date(b.scannedAt || 0) - new Date(a.scannedAt || 0))
}

function ReportDetailModal({ batch, onClose, onSubmit, onDelete, isSubmitting }) {
  if (!batch) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Daily report</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{batch.department || 'Unknown Department'}</h3>
            <p className="mt-1 text-sm text-slate-400">Scanned {formatReportDate(batch.scannedAt)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/20">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-700 bg-slate-950 p-2 text-slate-300 transition-colors hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[72vh] overflow-auto px-5 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Employees involved</p>
              <p className="mt-2 text-2xl font-bold text-white">{batch.employeeCount}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Department</p>
              <p className="mt-2 text-lg font-semibold text-white">{batch.department || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Thickness</p>
              <p className="mt-2 text-lg font-semibold text-white">{batch.thickness || '-'}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Crates / Pieces</p>
              <p className="mt-2 text-lg font-semibold text-white">{batch.cratesPieces || '-'}</p>
            </div>
          </div>

          <DailyReportTable entries={batch.entries} />

          <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Date and time scanned</p>
              <p className="mt-2 text-sm text-slate-200">{formatReportDate(batch.scannedAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total entries</p>
              <p className="mt-2 text-sm text-slate-200">{batch.entries.length}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 text-slate-200 transition-colors hover:bg-slate-700">
            Cancel
          </button>
          <button type="button" disabled={isSubmitting} onClick={onSubmit} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">
            <Send className="h-4 w-4" /> {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LeadmanDailyReport() {
  const { user } = useAuth()
  const { submitDailyReport, selectedLeadmanDepartment, setSelectedLeadmanDepartment, getDailyReportDraft, removeDailyReportBatch } = useQr()
  const dialog = useDialog()

  const assignedDepartments = useMemo(() => {
    if (Array.isArray(user?.departments) && user.departments.length > 0) return user.departments
    if (user?.department) return [user.department]
    return []
  }, [user?.department, user?.departments])

  const selectedDepartment = selectedLeadmanDepartment || assignedDepartments[0] || ''
  const reportDate = new Date().toISOString().slice(0, 10)
  const dailyReportDraft = getDailyReportDraft(selectedDepartment, reportDate)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const reportEntries = useMemo(() => (Array.isArray(dailyReportDraft.entries) ? dailyReportDraft.entries : []), [dailyReportDraft.entries])
  const reportBatches = useMemo(() => groupReportEntries(reportEntries), [reportEntries])
  const selectedBatch = useMemo(() => reportBatches.find((batch) => batch.id === selectedBatchId) || null, [reportBatches, selectedBatchId])

  useEffect(() => {
    if (assignedDepartments.length === 0) return
    if (!assignedDepartments.includes(selectedDepartment)) {
      setSelectedLeadmanDepartment(assignedDepartments[0])
    }
  }, [assignedDepartments, selectedDepartment, setSelectedLeadmanDepartment])

  async function submitReport() {
    const consolidatedEntries = reportBatches.flatMap((batch) => Array.isArray(batch.entries) ? batch.entries : []).filter(hasMeaningfulEntry)
    if (consolidatedEntries.length === 0) {
      setSubmitError('No valid scanned entries found to consolidate.')
      return
    }

    const shouldSubmit = await dialog.confirm({
      title: 'Submit daily report?',
      message: `Submit consolidated report for ${selectedDepartment}? This will merge all scanned cards into one daily table and send it to Production In-Charge and Finance.`,
      confirmText: 'Submit consolidated',
      cancelText: 'Cancel',
    })
    if (!shouldSubmit) return

    setSubmitMessage('')
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const submittedBy = user?.id || null
      const submittedByName = user?.name || null
      const totalPieces = consolidatedEntries.reduce((sum, entry) => {
        const pieces = Number(entry.pieces || entry.raw?.qrFields?.cratePieces || entry.qrFields?.cratePieces || entry.raw?.qrFields?.crates || entry.qrFields?.crates || 0)
        return sum + (Number.isFinite(pieces) ? pieces : 0)
      }, 0)
      const totalAmount = consolidatedEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      const summary = `Consolidated report • ${consolidatedEntries.length} rows • ${totalPieces} crates/pieces • ₱${totalAmount.toLocaleString()}`
      await submitDailyReport(selectedDepartment, reportDate, submittedBy, submittedByName, summary, consolidatedEntries)
      setSubmitMessage('Consolidated report submitted successfully.')
      dialog.success({
        title: 'Consolidated report submitted',
        message: `Consolidated report for ${selectedDepartment} was submitted successfully.`,
      })
    } catch (error) {
      setSubmitError(error?.message || 'Failed to submit daily report. Please try again.')
      dialog.error({
        title: 'Submission failed',
        message: error?.message || 'Failed to submit daily report. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitSingleBatch(batch) {
    if (!batch) return

    setSubmitMessage('')
    setSubmitError('')
    setIsSubmitting(true)

    try {
      const submittedBy = user?.id || null
      const submittedByName = user?.name || null
      const validEntries = (Array.isArray(batch.entries) ? batch.entries : []).filter(hasMeaningfulEntry)
      const totalPieces = validEntries.reduce((sum, entry) => {
        const pieces = Number(entry.pieces || entry.raw?.qrFields?.cratePieces || entry.qrFields?.cratePieces || entry.raw?.qrFields?.crates || entry.qrFields?.crates || 0)
        return sum + (Number.isFinite(pieces) ? pieces : 0)
      }, 0)
      const totalAmount = validEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
      const summary = `Consolidated report • ${validEntries.length} rows • ${totalPieces} crates/pieces • ₱${totalAmount.toLocaleString()}`
      await submitDailyReport(selectedDepartment, reportDate, submittedBy, submittedByName, summary, validEntries)
      setSubmitMessage('Report submitted successfully.')
      setSelectedBatchId('')
      dialog.success({
        title: 'Report submitted',
        message: 'The selected report was submitted successfully.',
      })
    } catch (error) {
      setSubmitError(error?.message || 'Failed to submit report. Please try again.')
      dialog.error({
        title: 'Submission failed',
        message: error?.message || 'Failed to submit report. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function deleteBatch(batch) {
    if (!batch) return
    const shouldDelete = await dialog.confirm({
      title: 'Delete report?',
      message: 'Delete this report? This will remove it from the current draft.',
      confirmText: 'Yes, delete',
      cancelText: 'Cancel',
      kicker: 'Confirm delete',
    })
    if (!shouldDelete) return
    removeDailyReportBatch(selectedDepartment, reportDate, batch.batchId)
    if (selectedBatchId === batch.id) setSelectedBatchId('')
    dialog.success({
      title: 'Report deleted',
      message: 'The report was removed from the current draft successfully.',
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Leadman daily log</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Daily Production Report</h2>
            <p className="mt-1 text-sm text-slate-400">Write and save the end-of-day production report for the selected department.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Department</p>
            <select value={selectedDepartment} onChange={(e) => setSelectedLeadmanDepartment(e.target.value)} className="mt-2 min-w-[220px] rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none">
              {assignedDepartments.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white"><MessageSquareWarning className="h-5 w-5 text-cyan-400" /> Daily Production Report</h3>
        <p className="text-sm text-slate-400">Each scanned report becomes a small card. Open a card for the full report and submit it individually, or submit all cards in one batch.</p>

        {reportBatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">No scanned reports yet.</div>
        ) : (
          <div className="grid gap-4">
            {reportBatches.map((batch) => (
              <div
                key={batch.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBatchId(batch.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedBatchId(batch.id)
                  }
                }}
                className="group relative rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left transition-all hover:border-emerald-500/30 hover:bg-slate-900"
              >
                <div className="absolute right-3 top-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteBatch(batch)
                    }}
                    className="rounded-full border border-rose-500/20 bg-rose-500/10 p-2 text-rose-300 transition-colors hover:bg-rose-500/20"
                    aria-label="Delete report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="pr-12 md:flex md:items-center md:gap-5">
                  <div className="min-w-0 md:flex-1">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Scanned report</p>
                  
                    <p className="mt-1 text-sm text-slate-400">{formatReportDate(batch.scannedAt)}</p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3 md:mt-0 md:w-[56%] md:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Employees</p>
                      <p className="mt-1 text-sm font-semibold text-white">{batch.employeeCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Thickness</p>
                      <p className="mt-1 text-sm font-semibold text-white">{batch.thickness || '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2">
                      <p className="text-[11px] text-slate-500">Crates / Pieces</p>
                      <p className="mt-1 text-sm font-semibold text-white">{batch.cratesPieces || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500 md:mt-0 md:min-w-[120px] md:flex-col md:items-end md:justify-center">
                    <span>{batch.entries.length} row{batch.entries.length === 1 ? '' : 's'}</span>
                    <span className="text-emerald-400 group-hover:text-emerald-300">Open report</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{reportBatches.length > 0 ? `${reportBatches.length} scanned report${reportBatches.length === 1 ? '' : 's'} loaded.` : 'No scanned entries yet.'}</p>
          <button disabled={isSubmitting || reportEntries.length === 0} onClick={submitReport} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70">
            <Send className="h-4 w-4" /> {isSubmitting ? 'Submitting...' : 'Submit Consolidated Report'}
          </button>
        </div>
        {submitMessage ? <p className="text-sm text-emerald-400">{submitMessage}</p> : null}
        {submitError ? <p className="text-sm text-rose-400">{submitError}</p> : null}
      </div>

      <ReportDetailModal
        batch={selectedBatch}
        isSubmitting={isSubmitting}
        onClose={() => setSelectedBatchId('')}
        onDelete={() => deleteBatch(selectedBatch)}
        onSubmit={() => submitSingleBatch(selectedBatch)}
      />
    </div>
  )
}