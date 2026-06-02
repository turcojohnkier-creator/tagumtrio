import { Users, FileSpreadsheet, PieChart } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HRDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 mt-1">Overview of employee records, requests, and HR actions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/app/gm/employees" className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-md"><Users className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Employees</p>
              <p className="text-lg font-semibold text-white">Manage personnel</p>
            </div>
          </div>
        </Link>

        <Link to="/app/hr/create-account" className="rounded-xl border border-slate-800 bg-slate-900 p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-md"><Users className="w-5 h-5 text-cyan-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Provision accounts</p>
              <p className="text-lg font-semibold text-white">Create user accounts</p>
            </div>
          </div>
        </Link>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-md"><FileSpreadsheet className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Leave Requests</p>
              <p className="text-lg font-semibold text-white">Process and review</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-md"><PieChart className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <p className="text-xs text-slate-400">Workforce Analytics</p>
              <p className="text-lg font-semibold text-white">View trends & reports</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 mt-4">
        <p className="text-sm text-slate-400">Recent activity</p>
        <div className="mt-3 text-sm text-slate-400">No recent HR activity (UI placeholder).</div>
      </div>
    </div>
  )
}

