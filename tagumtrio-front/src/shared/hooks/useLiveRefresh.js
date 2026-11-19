import { useEffect, useRef } from 'react'
import { useAppData } from '../../context/app-data-context'
import { startVisiblePolling } from '../../lib/polling'

/**
 * Keep a page's data fresh without a manual reload.
 *
 * `load` re-runs:
 *   - as soon as a notification of one of `types` arrives (see updateSignals
 *     in the app data provider), e.g. a report landing in this page's queue;
 *   - every `intervalMs` while the tab is visible, as a safety net;
 *   - when the user comes back to the tab/window.
 *
 * Call your own initial load as before; this hook only handles refreshes.
 * `load` is held in a ref, so it doesn't need to be memoised.
 *
 * `clearTypes`: notification types this page displays. When one arrives while
 * the page is open, it is marked seen right away, so the nav red dot doesn't
 * light up for something the user is already looking at (the toast still shows).
 */
export default function useLiveRefresh(load, { types = [], clearTypes = [], intervalMs = 30000, enabled = true } = {}) {
  const { updateSignals = {}, markNotificationsSeen } = useAppData()
  const clearRef = useRef({ clearTypes, markNotificationsSeen })
  useEffect(() => {
    clearRef.current = { clearTypes, markNotificationsSeen }
  })
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  // Sum of this page's signal counters; it only ever goes up.
  const signal = types.reduce((sum, type) => sum + Number(updateSignals[type] || 0), 0)
  const lastSignalRef = useRef(signal)

  useEffect(() => {
    if (!enabled) return
    if (signal === lastSignalRef.current) return
    lastSignalRef.current = signal
    loadRef.current?.()
    const { clearTypes: toClear, markNotificationsSeen: markSeen } = clearRef.current
    toClear.forEach((type) => markSeen?.(type))
  }, [signal, enabled])

  useEffect(() => {
    if (!enabled) return undefined
    // The page already did its initial load, so skip the immediate run.
    return startVisiblePolling(() => loadRef.current?.(), intervalMs, { immediate: false })
  }, [enabled, intervalMs])
}
