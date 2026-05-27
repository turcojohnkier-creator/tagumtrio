import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQr } from '../../context/qr-context'
import { useAuth } from '../../context/auth-context'

export default function EmployeePayroll() {
  const { employeeId } = useParams()
  const { user } = useAuth()
  const { getPayslipPeriods, getPayslipPeriod, getEmployeeTotals, markPayslipReleased, isPayslipReleased, getEmployeePayments, formatDateTime } = useQr()
  const periods = getPayslipPeriods(employeeId)
  const totals = getEmployeeTotals(employeeId)
  const payments = getEmployeePayments(employeeId)
  const [busy, setBusy] = useState(false)

  function handleRelease(periodKey) {
    if (!user) return
    setBusy(true)
    markPayslipReleased(employeeId, periodKey, user.id)
    setBusy(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Employee Payroll</h2>
        <p className="text-slate-400 mt-1">Payroll periods and payments for employee <strong className="text-white">{employeeId}</strong>.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{totals?.latestRecord?.employeeName || employeeId}</h3>
            <p className="text-sm text-slate-400">ID: {employeeId}</p>
          </div>
          <div className="text-sm text-slate-300">
            <p>Total Amount: <span className="text-emerald-400 font-semibold">₱{Number(totals.totalAmount || 0).toLocaleString()}</span></p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-white">Payslip Periods</h4>
        {periods.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-400">No payslip periods available.</div>
        ) : (
          <div className="space-y-3">
            {periods.map((p) => (
              <div key={p.key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{p.label}</div>
                  <div className="text-sm text-slate-400">{p.recordCount} records — ₱{Number(p.totalAmount).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Link to={`/app/payroll/employee/${employeeId}/period/${p.key}`} className="text-sky-400 hover:underline">View Records</Link>
                  {isPayslipReleased(employeeId, p.key) ? (
                    <span className="text-emerald-400 font-medium">Released</span>
                  ) : (
                    <button disabled={busy} onClick={() => handleRelease(p.key)} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-3 py-1 rounded">Confirm Payment Released</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-lg font-semibold text-white">Payment History</h4>
        {payments.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-slate-400">No payment releases recorded yet.</div>
        ) : (
          <div className="space-y-2 mt-2">
            {payments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-3">
                <div className="text-slate-300">
                  <div>Period: <span className="text-white">{pay.period}</span></div>
                  <div className="text-sm text-slate-400">Amount: ₱{Number(pay.amount).toLocaleString()}</div>
                </div>
                <div className="text-sm text-slate-400">Released: {formatDateTime(pay.releasedAt)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
