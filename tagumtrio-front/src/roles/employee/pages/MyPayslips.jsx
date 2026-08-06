import { useMemo, useState } from 'react'
import { Download, Eye, FileText, ArrowLeft, Receipt, Clock, ListChecks, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import { toManilaDateKey } from '../../../lib/datetime'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

export default function MyPayslips() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getPayslipPeriods, getEmployeeTotals, formatDateTime } = useAppData()

  const [openModal, setOpenModal] = useState(false)
  const [modalMode, setModalMode] = useState('accumulated')

  const periods = useMemo(() => getPayslipPeriods(user?.id), [getPayslipPeriods, user?.id])
  const totals = useMemo(() => getEmployeeTotals(user?.id), [getEmployeeTotals, user?.id])
  const todayKey = toManilaDateKey()
  const allRecords = totals?.records || []
  const todaysRecords = useMemo(() => {
    return allRecords.filter((record) => toManilaDateKey(record.scannedAt || record.reportDate || record.createdAt) === todayKey)
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
          <button onClick={() => navigate('/app/portal')} className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <h2 className="font-heading text-2xl font-bold text-zinc-900">Payslips</h2>
        <p className="text-zinc-500 text-sm mt-1">Detailed pay sheets with department, report date, rate, and amount.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => { setModalMode('accumulated'); setOpenModal(true) }}
          className="relative overflow-hidden text-left rounded-xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700/70">Total salary accumulated</p>
              <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-emerald-700">₱{(totals.totalAmount || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-emerald-500 p-2.5 text-white shadow-sm shadow-emerald-500/30">
              <ListChecks className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-500">Click to view report history and salary amounts by work entry.</p>
        </button>
        <button
          type="button"
          onClick={() => { setModalMode('today'); setOpenModal(true) }}
          className="relative overflow-hidden text-left rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Today's salary</p>
              <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-zinc-900">₱{todaysSalary.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-zinc-100 p-2.5 text-zinc-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-zinc-400">Click to inspect today's report entries and earned amounts.</p>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">Use the cards above to review your salary report details.</p>
        </div>
        <Button
          type="button"
          onClick={() => { setModalMode('receipt'); setOpenModal(true) }}
        >
          <Receipt className="w-4 h-4" /> Generate payslip
        </Button>
      </div>

      {openModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-center justify-center py-8">
          <div className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-lg border border-zinc-200 bg-white">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{modalMode === 'receipt' ? 'Receipt preview' : 'Report history'}</p>
                <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{modalTitle}</h3>
                <p className="mt-1 text-sm text-zinc-500">Review the work report details for this employee.</p>
              </div>
              <button type="button" onClick={() => setOpenModal(false)} className="rounded-md border border-zinc-200 bg-zinc-50 p-2 text-zinc-600 transition-colors hover:bg-zinc-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 px-5 py-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Employee</p>
                <p className="mt-2 text-lg font-semibold text-zinc-900">{user?.name || 'Employee'}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Total salary</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700">₱{(totals.totalAmount || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Entries</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">{modalMode === 'today' ? todaysRecords.length : allRecords.length}</p>
              </div>
            </div>

            <div className="px-5 pb-4">
              {modalMode === 'receipt' ? (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6">
                  <div className="flex items-center gap-3 text-emerald-700 mb-4">
                    <Receipt className="w-5 h-5" />
                    <h4 className="font-heading text-lg font-bold">Receipt details</h4>
                  </div>
                  <p className="text-zinc-700 mb-4">This is a preview of the employee receipt using their current salary totals.</p>
                  <div className="space-y-3 text-sm text-zinc-500">
                    <p><span className="font-medium text-zinc-800">Employee:</span> {user?.name || 'Employee'}</p>
                    <p><span className="font-medium text-zinc-800">Total salary:</span> ₱{(totals.totalAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="max-h-[52vh] overflow-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-emerald-50/70 text-emerald-800">
                      <tr>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {modalRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No report entries available for this date range.</td>
                        </tr>
                      ) : (
                        modalRecords.map((record, index) => (
                          <tr key={`${record.id || index}-${index}`} className="hover:bg-emerald-50/40">
                            <td className="px-4 py-3 text-zinc-800">{formatDateTime(record.scannedAt || record.reportDate || record.createdAt)}</td>
                            <td className="px-4 py-3 text-zinc-700">{record.department || record.section || 'N/A'}</td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">₱{Number(record.amount || 0).toLocaleString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-500">Use this history view to inspect the salary entries behind each amount.</p>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpenModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
          </div>
        </div>
      )}

      {periods.length === 0 ? (
        <EmptyState title="No verified payslip history yet" />
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2"
          initial="hidden" animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {periods.map((period) => (
            <motion.div key={period.key} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } } }} className="flex flex-col justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900">{period.label}</h3>
                  <p className="mt-0.5 text-sm text-zinc-500">{period.recordCount} verified work logs</p>
                  <p className="mt-2 font-semibold tabular-nums text-emerald-700">₱{period.totalAmount.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-zinc-400">Last updated {formatDateTime(period.latestDate)}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
                <button onClick={() => navigate(`/app/portal/payslips/${period.key}`)} className="flex items-center justify-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900">
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button className="flex items-center justify-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 transition-colors hover:bg-emerald-100">
                  <Download className="w-4 h-4" /> PDF
                </button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-500">Payslips are broken down by department and report date for transparency.</p>
      </div>
    </div>
  )
}
