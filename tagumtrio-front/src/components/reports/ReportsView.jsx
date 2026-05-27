import React, { useEffect, useState } from 'react'
import { fetchDailyReportsApi } from '../../lib/api'

export default function ReportsView({ department = '', reportDate = '' }) {
  const [reports, setReports] = useState([])
  useEffect(() => {
    let mounted = true
    fetchDailyReportsApi({ department: department || undefined, reportDate: reportDate || undefined })
      .then((r) => { if (mounted) setReports(r || []) })
      .catch(() => {})
    return () => { mounted = false }
  }, [department, reportDate])

  if (!reports || reports.length === 0) return <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No submitted reports yet.</div>

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <div key={report.id} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">{report.department} • {report.reportDate}</div>
              <div className="text-xs text-slate-500">Submitted by {report.submittedByName || report.submittedBy || 'Unknown'} • {new Date(report.createdAt || report.created_at || Date.now()).toLocaleString()}</div>
            </div>
            <div className="text-sm text-slate-300">Entries: {Array.isArray(report.entries) ? report.entries.length : 0}</div>
          </div>
          <div className="mt-3 text-sm text-slate-600">{report.summary || 'No notes provided.'}</div>
        </div>
      ))}
    </div>
  )
}
