import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { formatEmployeeId } from '../../lib/employeeId'
import { formatRole } from '../../lib/roles'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

const GAP = 8
const VIEWPORT_MARGIN = 8
const MAX_DEPARTMENT_CHIPS = 3

// Stop clicks/keys inside the card from reaching whatever the name sits in
// (React bubbles portal events through the component tree, e.g. a clickable
// report card would otherwise open too).
function stop(event) {
  event.stopPropagation()
}

// Mini profile shown while hovering a person's name (see ProfileLink).
// Portaled to <body> with fixed positioning so tables with overflow and
// scrolling modals can't clip it. Not the shared Portal: that locks page scroll.
export default function ProfileHoverCard({ account, anchorRef, onPointerEnter, onPointerLeave, onViewProfile }) {
  const cardRef = useRef(null)

  // Place it under the name, flip above when there's no room below, and keep
  // it inside the viewport horizontally. Runs before paint, so no jump.
  useLayoutEffect(() => {
    const card = cardRef.current
    const anchor = anchorRef.current
    if (!card || !anchor) return
    const rect = anchor.getBoundingClientRect()
    const { offsetWidth: width, offsetHeight: height } = card
    let top = rect.bottom + GAP
    if (top + height > window.innerHeight - VIEWPORT_MARGIN && rect.top - GAP - height >= VIEWPORT_MARGIN) {
      top = rect.top - GAP - height
    }
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), maxLeft)
    card.style.top = `${top}px`
    card.style.left = `${left}px`
    card.style.visibility = 'visible'
  }, [anchorRef])

  const id = account.employeeId ?? account.id
  const name = account.employeeName || account.name || 'Unknown'
  const isActive = account.is_active !== false
  const departments = Array.isArray(account.departments) && account.departments.length > 0
    ? account.departments
    : (account.department ? [account.department] : [])
  const extraDepartments = departments.length - MAX_DEPARTMENT_CHIPS

  return createPortal(
    <motion.div
      ref={cardRef}
      role="dialog"
      aria-label={`${name}'s profile preview`}
      style={{ position: 'fixed', top: 0, left: 0, visibility: 'hidden' }}
      className="z-[98] w-72 max-w-[calc(100vw-16px)] rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-lg"
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={stop}
      onKeyDown={stop}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} src={account.avatar_url} size="xl" className="bg-emerald-100 text-emerald-800" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-bold text-zinc-900">{name}</p>
          <p className="truncate text-xs text-zinc-500">
            {formatEmployeeId(id)}
            {account.identifier ? ` · @${account.identifier}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="info" className="px-2 py-0.5 text-[11px]">{formatRole(account.role) || '—'}</Badge>
            <Badge variant={isActive ? 'success' : 'neutral'} className="px-2 py-0.5 text-[11px]">{isActive ? 'Active' : 'Archived'}</Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">{departments.length > 1 ? 'Departments' : 'Department'}</p>
        {departments.length === 0 ? (
          <p className="mt-1 text-sm text-zinc-500">Unassigned</p>
        ) : (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {departments.slice(0, MAX_DEPARTMENT_CHIPS).map((department) => (
              <span key={department} className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                {department}
              </span>
            ))}
            {extraDepartments > 0 ? (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600">
                +{extraDepartments} more
              </span>
            ) : null}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onViewProfile()
        }}
        className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
      >
        View profile
      </button>
    </motion.div>,
    document.body
  )
}
