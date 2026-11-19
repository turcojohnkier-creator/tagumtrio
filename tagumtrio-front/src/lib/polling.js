/**
 * Run `fn` now and then every `intervalMs`, but only while the tab is visible.
 * When a hidden tab becomes visible again (or the window regains focus) it
 * runs straight away, so coming back to the app always shows fresh data
 * without hammering the backend from background tabs.
 *
 * Returns a stop() function.
 */
export function startVisiblePolling(fn, intervalMs, { immediate = true } = {}) {
  if (typeof window === 'undefined') return () => {}

  let timer = null
  let lastRun = 0
  // Focus and visibilitychange often fire together; don't run twice.
  const MIN_GAP_MS = 1000

  const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

  const run = () => {
    const now = Date.now()
    if (now - lastRun < MIN_GAP_MS) return
    lastRun = now
    try {
      const result = fn()
      if (result && typeof result.catch === 'function') result.catch(() => {})
    } catch {
      // polling must never throw into the caller
    }
  }

  const start = () => {
    if (timer) return
    timer = setInterval(() => { if (isVisible()) run() }, intervalMs)
  }
  const stopTimer = () => {
    if (timer) clearInterval(timer)
    timer = null
  }

  const onVisibility = () => {
    if (isVisible()) {
      run()
      start()
    } else {
      stopTimer()
    }
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', onVisibility)

  if (immediate && isVisible()) run()
  if (isVisible()) start()

  return () => {
    stopTimer()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('focus', onVisibility)
  }
}
