import { useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../context/auth-context'
import { formatDateKey } from '../../../lib/datetime'
import { formatPayAmount } from '../../../lib/payslip'
import { formatProductWithUnit } from '../../../lib/units'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'
import PayslipDocument from '../components/PayslipDocument'
import usePayslipWeeks from '../hooks/usePayslipWeeks'

export default function ViewPayslip() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { weeks, loading, error } = usePayslipWeeks(user?.id)

  const index = useMemo(() => weeks.findIndex((week) => week.key === id), [weeks, id])
  const week = index >= 0 ? weeks[index] : null
  // Weeks are newest first, so "older" is the next index.
  const olderWeek = index >= 0 ? weeks[index + 1] : null
  const newerWeek = index > 0 ? weeks[index - 1] : null

  // "Print" on the payslip list opens this page with ?print=1 — print once
  // the slip has rendered, then drop the flag so a refresh doesn't re-print.
  const printedRef = useRef(false)
  useEffect(() => {
    if (!week || searchParams.get('print') !== '1' || printedRef.current) return
    printedRef.current = true
    setSearchParams({}, { replace: true })
    requestAnimationFrame(() => window.print())
  }, [week, searchParams, setSearchParams])

  const employee = { id: user?.id, name: user?.name, department: user?.department }
  const goBack = () => navigate('/app/portal/payslips')

  if (loading) {
    return <div className="mx-auto max-w-5xl p-6 text-sm text-zinc-500">Loading payslip…</div>
  }

  if (!week) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <button onClick={goBack} className="inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" /> Back to payslips</button>
        <EmptyState
          title={error ? 'Unable to load payslip' : 'Payslip not found'}
          description={error || 'There is no approved pay for this week.'}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button onClick={goBack} className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"><ArrowLeft className="h-4 w-4" /> Back to payslips</button>
          <h2 className="font-heading text-2xl font-bold text-zinc-900">Payslip</h2>
          <p className="mt-1 text-sm text-zinc-500">{week.label} · Total <span className="font-semibold text-emerald-700">₱{formatPayAmount(week.pakyawan)}</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={!olderWeek} onClick={() => navigate(`/app/portal/payslips/${olderWeek.key}`)} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button variant="secondary" disabled={!newerWeek} onClick={() => navigate(`/app/portal/payslips/${newerWeek.key}`)} aria-label="Next week">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {/* The slip itself — the only thing that prints (see .print-area in index.css). */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 sm:p-8">
        <div className="mx-auto w-fit shadow-md">
          <div className="print-area payslip-print">
            <PayslipDocument employee={employee} week={week} />
          </div>
        </div>
      </div>

      {/* On-screen transparency: every report entry behind this payslip. */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="font-heading text-base font-semibold text-zinc-900">Work behind this payslip</h3>
        <p className="mt-1 text-sm text-zinc-500">Approved report entries from {week.label}. Only GM-approved work is paid.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-emerald-100 bg-emerald-50/70 text-emerald-800">
              <tr>
                <th className="px-4 py-3 font-medium">Work date</th>
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">Quantity</th>
                <th className="px-4 py-3 text-right font-medium">Rate per head</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[...week.entries].sort((a, b) => (a.workDate < b.workDate ? -1 : 1)).map((entry, i) => (
                <tr key={`${entry.reportId}-${entry.id || i}`} className="text-zinc-700">
                  <td className="px-4 py-3">{formatDateKey(entry.workDate, 'short')}</td>
                  <td className="px-4 py-3">{entry.department || entry.reportDepartment || '-'}</td>
                  <td className="px-4 py-3">{entry.product ? formatProductWithUnit(entry.product, entry.department || entry.reportDepartment) : '-'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{Number(entry.quantity || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-zinc-900">₱{formatPayAmount(entry.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-zinc-200 bg-zinc-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-zinc-900" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">₱{formatPayAmount(week.pakyawan)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
