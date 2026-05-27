import { ArrowLeft, Download, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'

export default function ViewPayslip() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPayslipPeriod, getPayslipPeriods, formatDateTime } = useQr()

  const period = getPayslipPeriod(user?.id, id)
  const periods = getPayslipPeriods(user?.id)
  const periodMeta = periods.find((entry) => entry.key === id)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/app/portal/payslips')} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <h2 className="text-2xl font-bold text-white">Payslip • {periodMeta?.label || 'Details'}</h2>
        <p className="text-slate-400 text-sm mt-1">Every report entry used in this payslip is listed below for transparency.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-medium">{periodMeta?.label || 'Payslip Detail'}</h3>
              <p className="text-sm text-slate-400 mt-1">Verified report entries: {period.records.length}</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-emerald-400 font-semibold">₱{period.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Scan Time</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Head Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {period.records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">No records for this pay period.</td>
                </tr>
              ) : (
                period.records.map((record) => (
                  <tr key={record.id} className="text-slate-300">
                    <td className="px-4 py-3">{formatDateTime(record.scannedAt)}</td>
                    <td className="px-4 py-3">{record.department}</td>
                    <td className="px-4 py-3">₱{Number(record.rate || 0).toLocaleString()}/hr</td>
                    <td className="px-4 py-3 font-medium text-white">₱{Number(record.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDateTime(record.headVerifiedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-2">
          <button className="px-4 py-2 bg-emerald-500 text-black rounded font-medium flex items-center gap-2"><Download className="w-4 h-4" /> Download PDF</button>
          <button onClick={() => navigate('/app/portal/payslips')} className="px-4 py-2 bg-slate-800 text-slate-200 rounded">Close</button>
        </div>
      </div>
    </div>
  )
}
