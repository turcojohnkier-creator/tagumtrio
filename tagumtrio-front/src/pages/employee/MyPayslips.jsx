import { useMemo } from 'react'
import { Download, Eye, FileText, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'

export default function MyPayslips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPayslipPeriods, formatDateTime } = useQr()

  const periods = useMemo(() => getPayslipPeriods(user?.id), [getPayslipPeriods, user?.id])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="mb-4">
          <button onClick={() => navigate('/app/portal')} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <h2 className="text-2xl font-bold text-white">Payslips</h2>
        <p className="text-slate-400 text-sm mt-1">Detailed pay sheets with department, scan time, rate, and amount.</p>
      </div>

      {periods.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400">No verified payslip history yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {periods.map((period) => (
            <div key={period.key} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 justify-between group hover:border-slate-700 transition-colors">
              <div className="flex gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{period.label}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{period.recordCount} verified work logs</p>
                  <p className="text-emerald-400 font-bold mt-2">₱{period.totalAmount.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs mt-1">Last updated {formatDateTime(period.latestDate)}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-800 pt-4">
                <button onClick={() => navigate(`/app/portal/payslips/${period.key}`)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 hover:text-white hover:border-slate-700 transition-colors">
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors">
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 text-center mt-8">
        <p className="text-slate-400 text-sm">Payslips are broken down by department and scan date for transparency.</p>
      </div>
    </div>
  )
}
