import React from 'react'
import { getEntryIdentifier, getEntryLabel, getEntryPieces } from './report-entry-utils'

function resolveEntryDepartment(entry, fallbackDepartment) {
  return entry?.department
    || entry?.raw?.department
    || entry?.raw?.qrFields?.department
    || entry?.qrFields?.department
    || fallbackDepartment
    || '-'
}

export default function DailyReportTable({ entries = [], fallbackDepartment = '' }) {
  const safeEntries = Array.isArray(entries) ? entries.filter((entry) => getEntryLabel(entry) || getEntryIdentifier(entry) || entry.department || entry.raw?.department || entry.raw?.qrFields?.department || entry.qrFields?.department || entry.thickness || entry.crates || entry.pieces || entry.date || entry.dateIn || entry.raw?.qrFields?.date || entry.raw?.qrFields?.dateIn) : []

  if (safeEntries.length === 0) {
    return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No report entries yet.</div>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium">Thickness</th>
            <th className="px-4 py-3 font-medium">Crates / Pieces</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70 bg-slate-900/50">
          {safeEntries.map((entry) => (
            <tr key={entry.id || `${getEntryIdentifier(entry)}-${getEntryLabel(entry)}-${entry.scannedAt || entry.raw?.batchCapturedAt || ''}`} className="text-slate-300 hover:bg-slate-900/80">
              <td className="px-4 py-4">
                <div className="font-medium text-white">{getEntryLabel(entry) || 'Untitled item'}</div>
                <div className="text-xs text-slate-500">{getEntryIdentifier(entry) || '-'}</div>
              </td>
              <td className="px-4 py-4 text-slate-300">{resolveEntryDepartment(entry, fallbackDepartment)}</td>
              <td className="px-4 py-4 text-slate-300">{entry.thickness || entry.raw?.qrFields?.thickness || entry.qrFields?.thickness || '-'}</td>
              <td className="px-4 py-4 text-slate-300">{getEntryPieces(entry) || entry.crates || entry.pieces || entry.raw?.pieces || entry.raw?.crates || entry.raw?.qrFields?.pieces || entry.raw?.qrFields?.crates || '-'}</td>
              <td className="px-4 py-4 text-slate-300">{entry.date || entry.dateIn || entry.raw?.qrFields?.date || entry.qrFields?.date || entry.raw?.qrFields?.dateIn || entry.qrFields?.dateIn || '-'}</td>
              <td className="px-4 py-4 font-semibold text-emerald-400">₱{Number(entry.amount || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
