import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchCurrentAttendanceApi } from '../../lib/api'

const POLL_MS = 30 * 1000
// Small delay past a boundary so the server is surely in the new session.
const BOUNDARY_SLACK_MS = 1500
// setTimeout misbehaves past ~24.8 days; boundaries are hours apart anyway.
const MAX_TIMEOUT_MS = 6 * 60 * 60 * 1000

// "13:00" -> "1:00 PM"
export function formatSessionTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''))
  if (!match) return String(value || '')
  const hours = Number(match[1])
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${match[2]} ${suffix}`
}

// The all-day session the server uses while the GM has time in / out switched off.
export function isDemoSession(session) {
  return session?.key === 'demo'
}

export function formatSessionRange(session) {
  if (!session) return ''
  if (isDemoSession(session)) return 'All day'
  return `${formatSessionTime(session.start)} – ${formatSessionTime(session.end)}`
}

// One-line session summary for GM screens, e.g. "Afternoon session · 1:00 PM – 4:00 PM"
// or "Lunch break · attendance resumes at 1:00 PM". `t` is the translation lookup.
export function describeAttendance(status, error, t) {
  if (status?.state === 'open' && isDemoSession(status.session)) {
    return t('gm.attendance.demo', 'Demo mode · time in / time out is off')
  }
  if (status?.state === 'open') {
    return `${t(`gm.attendance.${status.session.key}`, status.session.label)} · ${formatSessionRange(status.session)}`
  }
  if (status) {
    return `${t(`gm.attendance.${status.state}`)} ${formatSessionTime(status.nextSession?.start)}`
  }
  return error ? t('gm.attendance.error') : t('gm.attendance.loading')
}

/**
 * Live attendance for the current work session.
 *
 * The server decides which session is open. Everyone reads as inactive again
 * at each time-out because the session changes, so this hook refetches right
 * at `nextChangeAt` as well as polling, keeping screens in step with the reset.
 *
 * @param {string|undefined} department  Limit to one department; omit for all.
 */
export default function useAttendance(department, { enabled = true } = {}) {
  const scope = department || ''
  // Results are tagged with the department they were fetched for, so switching
  // departments never briefly shows the previous department's attendance.
  const [result, setResult] = useState({ scope: null, status: null, error: null })
  const requestRef = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled) return null
    const requestId = ++requestRef.current
    try {
      const next = await fetchCurrentAttendanceApi(scope || undefined)
      if (requestId === requestRef.current) setResult({ scope, status: next, error: null })
      return next
    } catch (err) {
      if (requestId === requestRef.current) {
        setResult((current) => ({ scope, status: current.scope === scope ? current.status : null, error: err }))
      }
      return null
    }
  }, [scope, enabled])

  // Initial load + polling.
  useEffect(() => {
    if (!enabled) return undefined
    refresh()
    const interval = setInterval(refresh, POLL_MS)
    return () => clearInterval(interval)
  }, [enabled, refresh])

  const status = result.scope === scope ? result.status : null
  const error = result.scope === scope ? result.error : null

  // Refetch exactly when the session changes (time-in / time-out).
  const nextChangeAt = status?.nextChangeAt
  useEffect(() => {
    if (!enabled || !nextChangeAt) return undefined
    const delay = new Date(nextChangeAt).getTime() - Date.now() + BOUNDARY_SLACK_MS
    if (!Number.isFinite(delay)) return undefined
    const timeout = setTimeout(refresh, Math.min(Math.max(delay, BOUNDARY_SLACK_MS), MAX_TIMEOUT_MS))
    return () => clearTimeout(timeout)
  }, [enabled, nextChangeAt, refresh])

  const presentEmployeeIds = status?.presentEmployeeIds
  const presentIds = useMemo(
    () => new Set((presentEmployeeIds || []).map((id) => Number(id))),
    [presentEmployeeIds]
  )

  // Lets a page apply an optimistic toggle or a server response directly.
  const replaceStatus = useCallback((next) => {
    requestRef.current += 1 // drop any in-flight poll that would overwrite this
    setResult({ scope, status: next, error: null })
  }, [scope])

  return {
    status,
    presentIds,
    isOpen: status?.state === 'open',
    loading: enabled && !status && !error,
    error,
    refresh,
    replaceStatus,
  }
}
