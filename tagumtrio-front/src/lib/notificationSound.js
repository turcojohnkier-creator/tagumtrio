// A short two-note chime for new notifications, synthesised with the Web Audio
// API so there's no audio file to load. Browsers only allow sound after the
// user has interacted with the page (logging in counts), so the audio context
// is created/resumed on the first click or key press.

const STORAGE_KEY = 'triops-notification-sound'
// Never chime more than once in this window (several polls/tabs at once).
const MIN_GAP_MS = 1500

let audioContext = null
let lastPlayedAt = 0
const listeners = new Set()

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!audioContext) audioContext = new AudioCtx()
  return audioContext
}

// Unlock audio on the first user gesture.
if (typeof window !== 'undefined') {
  const unlock = () => {
    const ctx = getContext()
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export function isNotificationSoundEnabled() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setNotificationSoundEnabled(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    // storage unavailable — the setting just won't persist
  }
  listeners.forEach((listener) => listener(enabled))
}

export function subscribeNotificationSound(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function tone(ctx, frequency, start, duration, volume) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  // Quick fade in/out so it doesn't click.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.05)
}

/** Play the chime, unless muted, the tab is hidden, or it just played. */
export function playNotificationSound({ force = false } = {}) {
  if (!force && !isNotificationSoundEnabled()) return
  if (!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') return
  const now = Date.now()
  if (!force && now - lastPlayedAt < MIN_GAP_MS) return
  const ctx = getContext()
  if (!ctx) return
  lastPlayedAt = now
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    const start = ctx.currentTime + 0.01
    tone(ctx, 880, start, 0.18, 0.18) // A5
    tone(ctx, 1318.5, start + 0.12, 0.28, 0.14) // E6
  } catch {
    // audio not available — notifications still show
  }
}
