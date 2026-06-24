import { useMemo, useState } from 'react'
import { Download, Eye, FileText, ArrowLeft, Receipt, Clock, ListChecks, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useQr } from '../../../context/qr-context'

function toDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

export default function MyPayslips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPayslipPeriods, getEmployeeTotals, formatDateTime } = useQr()

  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState('accumulated')

  const periods = useMemo(() => getPayslipPeriods(user?.id), [getPayslipPeriods, user?.id])
  const totals = useMemo(() => getEmployeeTotals(user?.id), [getEmployeeTotals, user?.id])
  const todayKey = new Date().toISOString().slice(0, 10)
  const allRecords = totals?.records || []
  const todaysRecords = useMemo(() => {
    return allRecords.filter((record) => toDateKey(record.scannedAt || record.reportDate || record.createdAt) === todayKey)
  }, [allRecords, todayKey])
  const todaysSalary = useMemo(() => {
    return todaysRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0)
  }, [todaysRecords])
  const modalRecords = modalMode === 'today' ? todaysRecords : allRecords
  const modalTitle = modalMode === 'today' ? "Today's salary history" : modalMode === 'accumulated' ? 'Salary history' : 'Generate payslip receipt'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="mb-4">
          <button onClick={() => navigate('/app/portal')} className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <h2 className="text-2xl font-semibold text-slate-900">Payslips</h2>
        <p className="text-slate-500 text-sm mt-1">Detailed pay sheets with department, scan time, rate, and amount.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => { setModalMode('accumulated'); setOpenModal(true) }}
          className="text-left rounded-xl border border-slate-200 bg-white p-6 transition hover:border-emerald-500 hover:bg-slate-50"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Total salary accumulated</p>
              <p className="mt-4 text-xl font-semibold text-slate-900">₱{(totals.totalAmount || 0).toLocaleString()}</p>
            </div>
            <ListChecks className="w-6 h-6 text-emerald-700" />
          </div>
          <p className="mt-3 text-sm text-slate-400">Click to view scan history and salary amounts by work entry.</p>
        </button>
        <button
          type="button"
          onClick={() => { setModalMode('today'); setOpenModal(true) }}
          className="text-left rounded-xl border border-slate-200 bg-white p-6 transition hover:border-cyan-500 hover:bg-slate-50"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Today's salary</p>
              <p className="mt-4 text-xl font-semibold text-slate-900">₱{todaysSalary.toLocaleString()}</p>
            </div>
            <Clock className="w-6 h-6 text-cyan-700" />
          </div>
          <p className="mt-3 text-sm text-slate-400">Click to inspect today's scan entries and earned amounts.</p>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Use the cards above to review your salary scan details.</p>
        </div>
        <button
          type="button"
          onClick={() => { setModalMode('receipt'); setOpenModal(true) }}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
        >
          <Receipt className="w-4 h-4" /> Generate payslip
        </button>
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{modalMode === 'receipt' ? 'Receipt preview' : 'Scan history'}</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{modalTitle}</h3>
                <p className="mt-1 text-sm text-slate-500">Review the work scan details for this employee.</p>
              </div>
              <button type="button" onClick={() => setOpenModal(false)} className="rounded-full border border-slate-300 bg-slate-50 p-2 text-slate-700 transition-colors hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Employee</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{user?.name || 'Employee'}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Total salary</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-700">₱{(totals.totalAmount || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">Entries</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{modalMode === 'today' ? todaysRecords.length : allRecords.length}</p>
              </div>
            </div>

            <div className="px-5 pb-4">
              {modalMode === 'receipt' ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center gap-3 text-emerald-700 mb-4">
                    <Receipt className="w-5 h-5" />
                    <h4 className="text-lg font-semibold">Receipt details</h4>
                  </div>
                  <p className="text-slate-700 mb-4">This is a preview of the employee receipt using their current salary totals.</p>
                  <div className="space-y-3 text-sm text-slate-500">
                    <p><span className="font-medium text-slate-800">Employee:</span> {user?.name || 'Employee'}</p>
                    <p><span className="font-medium text-slate-800">Total salary:</span> ₱{(totals.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[52vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-white text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 bg-white/50">
                      {modalRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-slate-500">No scan entries available for this date range.</td>
                        </tr>
                      ) : (
                        modalRecords.map((record, index) => (
                          <tr key={`${record.id || index}-${index}`} className="hover:bg-white/70">
                            <td className="px-4 py-4 text-slate-800">{formatDateTime(record.scannedAt || record.reportDate || record.createdAt)}</td>
                            <td className="px-4 py-4 text-slate-700">{record.department || record.section || 'N/A'}</td>
                            <td className="px-4 py-4 text-right font-semibold text-cyan-700">₱{Number(record.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">Use this history view to inspect the salary entries behind each amount.</p>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {periods.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center text-slate-500">No verified payslip history yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {periods.map((period) => (
            <div key={period.key} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 justify-between group hover:border-slate-300 transition-colors">
              <div className="flex gap-4 items-start">
                <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-700 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-slate-900 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-slate-900 font-medium">{period.label}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{period.recordCount} verified work logs</p>
                  <p className="text-emerald-700 font-semibold mt-2">₱{period.totalAmount.toLocaleString()}</p>
                  <p className="text-slate-400 text-xs mt-1">Last updated {formatDateTime(period.latestDate)}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-200 pt-4">
                <button onClick={() => navigate(`/app/portal/payslips/${period.key}`)} className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 hover:text-slate-900 hover:border-slate-300 transition-colors">
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors">
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white/50 border border-slate-200 rounded-xl p-6 text-center mt-8">
        <p className="text-slate-500 text-sm">Payslips are broken down by department and scan date for transparency.</p>
      </div>
    </div>
  )
}
