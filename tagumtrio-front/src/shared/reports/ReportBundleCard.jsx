import { ChevronRight } from 'lucide-react'
import Badge from '../ui/Badge'
import { getStatusLabel, getStatusVariant } from './report-status'

function formatBundleDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(date)
}

export default function ReportBundleCard({ bundle, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block w-full rounded-lg border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${selected ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-white hover:border-emerald-200'}`}
    >
      <div className="pr-12 md:flex md:items-center md:gap-5">
        <div className="min-w-0 md:flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Daily reports</p>
          <h4 className="mt-1 truncate font-heading text-lg font-bold text-zinc-900">{bundle.department}</h4>
          <p className="mt-1 text-sm text-zinc-500">{formatBundleDate(bundle.reportDate || bundle.latestDate)}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4 md:mt-0 md:w-[64%] md:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] text-zinc-400">Reports</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{bundle.reportCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] text-zinc-400">Employees</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900">{bundle.employeeCount}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] text-zinc-400">Status</p>
            <Badge variant={getStatusVariant(bundle.status)} className="mt-1">{getStatusLabel(bundle.status)}</Badge>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-emerald-700/70">Total amount</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-emerald-700">₱{Number(bundle.totalAmount || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-400 md:mt-0 md:min-w-[140px] md:flex-col md:items-end md:justify-center">
          <span className="flex items-center gap-1 text-emerald-600 group-hover:text-emerald-700">Open bundle <ChevronRight className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </button>
  )
}
