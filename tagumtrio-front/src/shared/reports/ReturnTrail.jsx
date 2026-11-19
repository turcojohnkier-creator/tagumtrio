import { Undo2 } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { getReturnHistory, returnLabel } from './report-status'

function formatWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Every time a report was sent back (GM -> production in-charge,
 * production in-charge -> leadman), newest first, so whoever holds it now
 * can see who returned it and why.
 */
export default function ReturnTrail({ report, history, limit, className = '' }) {
  const { t } = useAuth()
  const items = (history || getReturnHistory(report)).slice().reverse()
  const shown = limit ? items.slice(0, limit) : items
  if (shown.length === 0) return null

  return (
    <div className={`space-y-2 ${className}`}>
      {shown.map((entry, index) => (
        <div key={`${entry.at || ''}-${index}`} className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-rose-600">
            <Undo2 className="h-3.5 w-3.5" />
            {returnLabel(entry, t)}
            {entry.byName ? <span className="font-medium normal-case tracking-normal text-rose-500">· {entry.byName}</span> : null}
            {entry.at ? <span className="font-medium normal-case tracking-normal text-rose-500">· {formatWhen(entry.at)}</span> : null}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm font-medium text-rose-900">{entry.reason}</p>
        </div>
      ))}
    </div>
  )
}
