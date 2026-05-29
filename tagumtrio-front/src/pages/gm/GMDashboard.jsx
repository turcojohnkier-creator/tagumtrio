import { LayoutDashboard, Factory, BarChart2, FileSpreadsheet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQr } from '../../context/qr-context'

export default function GMDashboard() {
  const { announcements = [] } = useQr()
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">General Manager Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of production, daily reports, and workforce analytics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/app/production" className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-md"><Factory className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Production</p>
              <p className="text-lg font-semibold text-white">Monitor floor output</p>
            </div>
          </div>
        </Link>

        <Link to="/app/production/consolidated" className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-md"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Daily Reports</p>
              <p className="text-lg font-semibold text-white">Review & approve summaries</p>
            </div>
          </div>
        </Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-md"><BarChart2 className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Workforce Analytics</p>
              <p className="text-lg font-semibold text-white">Productivity & trends</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mt-4">
        <p className="text-sm text-slate-400">Pending approvals</p>
        <div className="mt-3 text-sm text-slate-400">No pending approvals (UI placeholder).</div>
      </div>
      {Array.isArray(announcements) && announcements.length > 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mt-4">
          <h3 className="text-lg font-semibold text-white">Announcements</h3>
          <div className="mt-3 text-sm text-slate-300 space-y-2">
            {announcements.slice(0,5).map((a) => (
              <div key={a.id}>
                <div className="text-sm text-white font-medium">{a.title}</div>
                {a.body && <div className="text-xs text-slate-400">{a.body}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
