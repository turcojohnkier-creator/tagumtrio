import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addDays, addMonths, buildMonthGrid, formatDateKey, getRange, parseDateKey, startOfMonth,
} from '../../lib/datetime'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Background tint grows with how many reports a day has (relative to the
// busiest visible day), so busy days stand out at a glance.
const TINTS = ['', 'bg-emerald-50', 'bg-emerald-100', 'bg-emerald-200']

function tintFor(count, max) {
  if (!count || !max) return ''
  return TINTS[Math.min(3, Math.max(1, Math.ceil((count / max) * 3)))]
}

/**
 * Controlled month calendar for picking a day / week / month of reports.
 *
 * - anchorKey: the selected date ("YYYY-MM-DD"); mode decides how much of the
 *   grid around it is highlighted (one day, its week row, or its month)
 * - markers: { [dateKey]: { count } } — days that have reports
 * - onSelect(dateKey): a day was picked (click, or arrow keys)
 */
export default function ReportCalendar({ anchorKey, mode = 'day', markers = {}, todayKey, onSelect }) {
  // The month being viewed can differ from the selection (browsing in day/week
  // mode), but snaps back to the selection's month whenever the selection moves.
  const [viewKey, setViewKey] = useState(() => startOfMonth(anchorKey))
  const [syncedAnchor, setSyncedAnchor] = useState(anchorKey)
  if (anchorKey !== syncedAnchor) {
    setSyncedAnchor(anchorKey)
    setViewKey(startOfMonth(anchorKey))
  }

  const gridRef = useRef(null)
  const grid = useMemo(() => buildMonthGrid(viewKey), [viewKey])
  const range = useMemo(() => getRange(mode, anchorKey), [mode, anchorKey])
  const viewMonth = parseDateKey(viewKey)?.getUTCMonth()

  const maxCount = useMemo(() => {
    let max = 0
    grid.flat().forEach((key) => { max = Math.max(max, markers[key]?.count || 0) })
    return max
  }, [grid, markers])

  function changeMonth(direction) {
    // In month mode the visible month IS the selection, so move the selection.
    if (mode === 'month') onSelect(addMonths(anchorKey, direction))
    else setViewKey(addMonths(viewKey, direction))
  }

  function focusDay(key) {
    // Wait for the grid to re-render (the month may have changed) before focusing.
    requestAnimationFrame(() => gridRef.current?.querySelector(`[data-day="${key}"]`)?.focus())
  }

  function handleKeyDown(event, key) {
    const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    if (!(event.key in moves)) return
    event.preventDefault()
    const next = addDays(key, moves[event.key])
    onSelect(next)
    focusDay(next)
  }

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="font-heading text-sm font-bold text-zinc-900">{formatDateKey(viewKey, 'monthYear')}</p>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {WEEKDAYS.map((day) => <div key={day} className="py-1">{day}</div>)}
      </div>

      <div ref={gridRef} className="mt-1 grid grid-cols-7 gap-1" role="grid" aria-label={`Reports calendar, ${formatDateKey(viewKey, 'monthYear')}`}>
        {grid.flat().map((key) => {
          const date = parseDateKey(key)
          const count = markers[key]?.count || 0
          const outside = date.getUTCMonth() !== viewMonth
          const inRange = key >= range.start && key <= range.end
          const isSelectedDay = mode === 'day' && key === anchorKey
          const isToday = key === todayKey

          let cellClass = 'text-zinc-800 hover:bg-zinc-100'
          if (isSelectedDay) cellClass = 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
          else if (inRange) cellClass = `${tintFor(count, maxCount) || 'bg-emerald-50/60'} text-zinc-900 ring-2 ring-inset ring-emerald-400`
          else if (count) cellClass = `${tintFor(count, maxCount)} text-zinc-900 hover:ring-1 hover:ring-inset hover:ring-emerald-300`
          if (outside && !inRange && !isSelectedDay) cellClass += ' opacity-40'

          return (
            <button
              key={key}
              type="button"
              data-day={key}
              onClick={() => onSelect(key)}
              onKeyDown={(event) => handleKeyDown(event, key)}
              tabIndex={key === anchorKey ? 0 : -1}
              aria-pressed={isSelectedDay || (mode !== 'day' && inRange)}
              aria-label={`${formatDateKey(key, 'long')}${count ? `, ${count} report${count === 1 ? '' : 's'}` : ', no reports'}`}
              className={`relative flex h-11 flex-col items-center justify-center rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${cellClass} ${isToday && !isSelectedDay ? 'font-bold text-emerald-700 underline decoration-2 underline-offset-4' : ''}`}
            >
              <span className="leading-none">{date.getUTCDate()}</span>
              {count ? (
                <span className={`mt-1 flex items-center gap-0.5 text-[10px] font-semibold leading-none ${isSelectedDay ? 'text-emerald-50' : 'text-emerald-700'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isSelectedDay ? 'bg-white' : 'bg-emerald-500'}`} />
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> reports that day</span>
        <span className="font-bold text-emerald-700 underline decoration-2 underline-offset-2">Today</span>
      </div>
    </div>
  )
}
