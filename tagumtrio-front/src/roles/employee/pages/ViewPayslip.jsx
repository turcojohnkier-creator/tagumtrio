import { ArrowLeft, Download, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import Button from '../../../shared/ui/Button'

export default function ViewPayslip() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPayslipPeriod, getPayslipPeriods, formatDateTime } = useAppData()

  const period = getPayslipPeriod(user?.id, id)
  const periods = getPayslipPeriods(user?.id)
  const periodMeta = periods.find((entry) => entry.key === id)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate('/app/portal/payslips')} className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
        <h2 className="font-heading text-2xl font-bold text-zinc-900">Payslip • {periodMeta?.label || 'Details'}</h2>
        <p className="text-zinc-500 text-sm mt-1">Every report entry used in this payslip is listed below for transparency.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-emerald-500 p-3 text-white shadow-sm shadow-emerald-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-medium text-zinc-900">{periodMeta?.label || 'Payslip Detail'}</h3>
              <p className="text-sm text-zinc-500 mt-1">Verified report entries: {period.records.length}</p>
            </div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-white px-4 py-3 text-left ring-1 ring-emerald-100 sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Total</p>
            <p className="font-mono text-xl font-bold tabular-nums text-emerald-700">₱{period.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/70 text-emerald-800">
              <tr>
                <th className="px-4 py-3 font-medium">Report Time</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Head Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {period.records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">No records for this pay period.</td>
                </tr>
              ) : (
                period.records.map((record) => (
                  <tr key={record.id} className="text-zinc-700">
                    <td className="px-4 py-3">{formatDateTime(record.scannedAt)}</td>
                    <td className="px-4 py-3">{record.department}</td>
                    <td className="px-4 py-3 tabular-nums">₱{Number(record.rate || 0).toLocaleString()}/hr</td>
                    <td className="px-4 py-3 font-medium tabular-nums text-zinc-900">₱{Number(record.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-zinc-500">{formatDateTime(record.headVerifiedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex gap-2">
          <Button><Download className="w-4 h-4" /> Download PDF</Button>
          <Button variant="secondary" onClick={() => navigate('/app/portal/payslips')}>Close</Button>
        </div>
      </div>
    </div>
  )
}
