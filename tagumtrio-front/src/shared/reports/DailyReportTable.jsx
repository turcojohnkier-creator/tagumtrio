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
    return <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm text-zinc-500">No report entries yet.</div>
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-emerald-50/70 text-emerald-800">
          <tr>
            <th className="px-4 py-3 font-medium">Employee</th>
            <th className="px-4 py-3 font-medium">Department</th>
            <th className="px-4 py-3 font-medium">Thickness</th>
            <th className="px-4 py-3 font-medium">Crates / Pieces</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {safeEntries.map((entry, index) => (
            <tr key={entry.id || `${getEntryIdentifier(entry)}-${getEntryLabel(entry)}-${entry.scannedAt || entry.raw?.batchCapturedAt || ''}`} className={`text-zinc-700 hover:bg-emerald-50/40 ${index % 2 === 1 ? 'bg-emerald-50/20' : ''}`}>
              <td className="px-4 py-4">
                <div className="font-medium text-zinc-900">{getEntryLabel(entry) || 'emp'}</div>
                <div className="text-xs text-zinc-400">{getEntryIdentifier(entry) || '-'}</div>
              </td>
              <td className="px-4 py-4 text-zinc-700">{resolveEntryDepartment(entry, fallbackDepartment)}</td>
              <td className="px-4 py-4 text-zinc-700">{entry.thickness || entry.raw?.qrFields?.thickness || entry.qrFields?.thickness || '-'}</td>
              <td className="px-4 py-4 text-zinc-700">{getEntryPieces(entry) || entry.crates || entry.pieces || entry.raw?.pieces || entry.raw?.crates || entry.raw?.qrFields?.pieces || entry.raw?.qrFields?.crates || '-'}</td>
              <td className="px-4 py-4 text-zinc-700">{entry.date || entry.dateIn || entry.raw?.qrFields?.date || entry.qrFields?.date || entry.raw?.qrFields?.dateIn || entry.qrFields?.dateIn || '-'}</td>
              <td className="px-4 py-4 font-semibold text-emerald-700">₱{Number(entry.amount || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
