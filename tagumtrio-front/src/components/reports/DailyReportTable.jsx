import React, { useState } from 'react'
import { getEntryIdentifier, getEntryPieces } from './report-entry-utils'

export default function DailyReportTable({ entries = [], fallbackDepartment = '' }) {
  const [expandedBatchId, setExpandedBatchId] = useState(null)

  // 1. Group entries by 'batchId'
  const groupedEntries = entries.reduce((acc, entry) => {
    const bId = entry.batchId || 'no-batch'
    if (!acc[bId]) acc[bId] = { items: [], info: entry.notes || entry.raw?.qrSummary || 'Untitled Item' }
    acc[bId].items.push(entry)
    return acc
  }, {})

  const batches = Object.entries(groupedEntries)

  if (entries.length === 0) {
    return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No report entries yet.</div>
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-950 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Item Details</th>
            <th className="px-4 py-3 font-medium">Employees Involved</th>
            <th className="px-4 py-3 font-medium text-right">Total Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {batches.map(([batchId, groupData]) => (
            <React.Fragment key={batchId}>
              {/* Summary Row */}
              <tr className="bg-slate-900/50 text-slate-200 hover:bg-slate-800/50 transition-colors">
                <td className="px-4 py-4 font-medium text-white max-w-xs truncate" title={groupData.info}>
                  {groupData.info}
                </td>
                <td className="px-4 py-4">
                  <button 
                    onClick={() => setExpandedBatchId(expandedBatchId === batchId ? null : batchId)}
                    className="bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold px-3 py-1 rounded-full text-xs transition-all border border-slate-700"
                  >
                    {groupData.items.length} {groupData.items.length === 1 ? 'Employee' : 'Employees'}
                  </button>
                </td>
                <td className="px-4 py-4 font-semibold text-emerald-400 text-right">
                  ₱{groupData.items.reduce((sum, e) => sum + Number(e.amount || 0), 0).toLocaleString()}
                </td>
              </tr>

              {/* Nested Detail Table */}
              {expandedBatchId === batchId && (
                <tr>
                  <td colSpan="3" className="px-0 py-0 bg-slate-950/40">
                    <div className="p-2">
                      <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-slate-950 text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Employee ID</th>
                            <th className="px-3 py-2">Pieces</th>
                            <th className="px-3 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-900/30 divide-y divide-slate-800">
                          {groupData.items.map((entry, idx) => (
                            <tr key={idx} className="text-slate-300">
                              <td className="px-3 py-2">{entry.employeeName || entry.employeeId || 'N/A'}</td>
                              <td className="px-3 py-2">{getEntryPieces(entry) || '-'}</td>
                              <td className="px-3 py-2 text-right text-emerald-400">
                                ₱{Number(entry.amount || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}