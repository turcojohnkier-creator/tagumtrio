import { useNavigate, useParams } from 'react-router-dom'
import { useQr } from '../../context/qr-context'

export default function PayrollPeriodView() {
  const { employeeId, periodKey } = useParams()
  const navigate = useNavigate()
  const { getPayslipPeriod, periodLabel, formatDateTime } = useQr()

  const period = getPayslipPeriod(employeeId, periodKey)
  const label = periodLabel(period.records[0]?.scannedAt || new Date().toISOString())

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white mb-4">Back</button>
        <h2 className="text-2xl font-bold text-white">{label} • {employeeId}</h2>
        <p className="text-slate-400 text-sm mt-1">Verified attendance records for the selected pay period.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Scanned</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {period.records.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">No records for this pay period.</td>
              </tr>
            ) : (
              period.records.map((record) => (
                <tr key={record.id} className="text-slate-300">
                  <td className="px-4 py-3">{formatDateTime(record.scannedAt)}</td>
                  <td className="px-4 py-3">{record.department}</td>
                  <td className="px-4 py-3">₱{Number(record.rate || 0).toLocaleString()}/hr</td>
                  <td className="px-4 py-3 font-medium text-white">₱{Number(record.amount || 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
