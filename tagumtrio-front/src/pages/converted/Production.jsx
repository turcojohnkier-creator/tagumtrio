import { QrCode, Search, Filter, PackageCheck } from 'lucide-react'
import { useAuth } from '../../context/auth-context'

const productionLogs = [
  { id: 'PRD-2026-001', product: 'Marine Plywood 3/4"', worker: 'Juan Dela Cruz', scannedAt: '08:45 AM', status: 'Verified', pieces: 25 },
  { id: 'PRD-2026-002', product: 'Ordinary Plywood 1/2"', worker: 'Pedro Penduko', scannedAt: '09:12 AM', status: 'Verified', pieces: 40 },
  { id: 'PRD-2026-003', product: 'Veneer Core 1/4"', worker: 'Maria Clara', scannedAt: '09:30 AM', status: 'Pending', pieces: 100 },
  { id: 'PRD-2026-004', product: 'Marine Plywood 1/2"', worker: 'Juan Dela Cruz', scannedAt: '10:15 AM', status: 'Verified', pieces: 30 },
  { id: 'PRD-2026-005', product: 'Ordinary Plywood 1/4"', worker: 'Jose Rizal', scannedAt: '10:45 AM', status: 'Verified', pieces: 55 },
]

export default function Production() {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">QR Production Process</h2>
          <p className="text-slate-400 mt-1">Scan and manage piece-rate production logs.</p>
        </div>
        <div className="text-sm text-slate-400">Scanning is performed by the employee via their mobile device (use the Employee Portal on your phone to scan physical QR codes).</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 bg-emerald-500/10 rounded-full">
            <PackageCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-slate-400 font-medium text-sm">Today's Scans</p>
            <h3 className="text-2xl font-bold text-white">1,248</h3>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-full">
            <QrCode className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <p className="text-slate-400 font-medium text-sm">Active Codes</p>
            <h3 className="text-2xl font-bold text-white">450</h3>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-center">
           <p className="text-sm font-medium text-slate-400 mb-2">Scanner Status</p>
           <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
             <span className="text-emerald-400 font-medium">Ready / Connected</span>
           </div>
        </div>
      </div>
      {/* Scanning moved to Employee Portal (mobile). */}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search by ID, worker, or product..." className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors w-full sm:w-auto justify-center">
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="p-4 text-sm font-semibold text-slate-400">Log ID</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Product</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Worker</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Pieces</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Scanned At</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {productionLogs.map((log) => (
                <tr key={log.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 text-sm font-medium text-emerald-400">{log.id}</td>
                  <td className="p-4 text-sm text-slate-300">{log.product}</td>
                  <td className="p-4 text-sm text-slate-300">{log.worker}</td>
                  <td className="p-4 text-sm font-semibold text-white">{log.pieces}</td>
                  <td className="p-4 text-sm text-slate-400">{log.scannedAt}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'Verified' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-800 text-center">
          <button className="text-sm text-emerald-400 hover:text-emerald-300 font-medium">View All Logs</button>
        </div>
      </div>
    </div>
  )
}
