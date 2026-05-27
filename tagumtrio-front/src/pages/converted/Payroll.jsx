import { Banknote, FileDown, Search, Filter, AlertCircle, Calendar } from 'lucide-react'

const payrollData = [
  { id: 'EMP-001', name: 'Juan Dela Cruz', role: 'Veneer Operator', pieceRateAmount: 12500, deductions: 1200, netPay: 11300, status: 'Ready' },
  { id: 'EMP-002', name: 'Pedro Penduko', role: 'Dryer Tender', pieceRateAmount: 14200, deductions: 1500, netPay: 12700, status: 'Ready' },
  { id: 'EMP-003', name: 'Maria Clara', role: 'Glue Mixer', pieceRateAmount: 11800, deductions: 800, netPay: 11000, status: 'Review Needed' },
  { id: 'EMP-004', name: 'Jose Rizal', role: 'Press Operator', pieceRateAmount: 15600, deductions: 1200, netPay: 14400, status: 'Approved' },
  { id: 'EMP-005', name: 'Andres Bonifacio', role: 'Finisher', pieceRateAmount: 13400, deductions: 1000, netPay: 12400, status: 'Ready' },
]

export default function Payroll() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Salary Management</h2>
          <p className="text-slate-400 mt-1">Review, approve, and generate payslips based on piece-rate production.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-slate-300">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>May 1 - May 15, 2026</span>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20">
            <Banknote className="w-5 h-5" />
            Process Payroll
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Payroll Summary</h3>
            <span className="text-sm font-medium text-slate-400">Total Period</span>
          </div>
          <div className="flex items-baseline gap-4">
            <h2 className="text-4xl font-bold text-emerald-400">₱ 1,452,800</h2>
            <span className="text-sm text-slate-400">Total Net Pay</span>
          </div>
          <div className="mt-6 flex items-center gap-6">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Gross</p>
              <p className="font-semibold text-white">₱ 1,620,000</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Deductions</p>
              <p className="font-semibold text-rose-400">₱ 167,200</p>
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-1">Employees</p>
              <p className="font-semibold text-white">284</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Pending Reviews</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-2">14</p>
          <p className="text-sm text-slate-400">Discrepancies in piece-rate calculation need approval.</p>
          <button className="mt-4 text-sm font-medium text-amber-400 hover:text-amber-300 w-fit">Review Now →</button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <FileDown className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Payslips</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-2">270/284</p>
          <p className="text-sm text-slate-400">Payslips generated and ready for distribution.</p>
          <button className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 w-fit">Generate Remaining →</button>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder="Search employee..." className="w-full bg-slate-950 border border-slate-800 text-white text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors w-full sm:w-auto justify-center">
            <Filter className="w-4 h-4" />
            Filter Status
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="p-4 text-sm font-semibold text-slate-400">Employee</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Role</th>
                <th className="p-4 text-sm font-semibold text-slate-400 text-right">Piece-Rate Total</th>
                <th className="p-4 text-sm font-semibold text-slate-400 text-right">Deductions</th>
                <th className="p-4 text-sm font-semibold text-slate-400 text-right">Net Pay</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Status</th>
                <th className="p-4 text-sm font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrollData.map((record) => (
                <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-medium text-white">{record.name}</p>
                    <p className="text-xs text-slate-500">{record.id}</p>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{record.role}</td>
                  <td className="p-4 text-sm text-slate-300 text-right">₱ {record.pieceRateAmount.toLocaleString()}</td>
                  <td className="p-4 text-sm text-rose-400 text-right">- ₱ {record.deductions.toLocaleString()}</td>
                  <td className="p-4 text-sm font-bold text-emerald-400 text-right">₱ {record.netPay.toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      record.status === 'Ready' ? 'bg-blue-500/10 text-blue-400' : record.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
