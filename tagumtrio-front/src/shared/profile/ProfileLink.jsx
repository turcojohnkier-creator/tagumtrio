import { useEffect, useRef, useState } from 'react'
import { useProfileViewer } from './profile-viewer-context'
import ProfileHoverCard from './ProfileHoverCard'

const LINK_CLASS = 'cursor-pointer rounded-md text-left decoration-emerald-500 underline-offset-2 transition-opacity hover:underline hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400'
// Hover this long before the card appears, so sweeping the mouse across a
// table doesn't flash cards; the close delay lets the pointer reach the card.
const OPEN_DELAY_MS = 400
const CLOSE_DELAY_MS = 150

// Wraps a person's avatar and/or name: hovering shows a mini profile card,
// clicking opens their full profile. Falls back to plain content when the
// viewer can't open profiles (employees) or the person doesn't match an account.
//
// `nested`: set when this sits inside another <button> (e.g. a clickable card),
// so it renders a focusable span instead of an invalid nested button.
// `onOpen`: replaces the default "open shared profile" (HR uses it to open the
// profile with archive actions).
export default function ProfileLink({ userId, name, nested = false, onOpen, className = '', children }) {
  const { canViewProfiles, findAccount, openProfile } = useProfileViewer()
  const account = canViewProfiles ? findAccount(userId, name) : null
  const triggerRef = useRef(null)
  const openTimerRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [cardOpen, setCardOpen] = useState(false)

  // Drop pending timers on unmount.
  useEffect(() => () => {
    clearTimeout(openTimerRef.current)
    clearTimeout(closeTimerRef.current)
  }, [])

  // A scroll or resize would leave the card floating away from its name.
  useEffect(() => {
    if (!cardOpen) return undefined
    const hide = () => {
      clearTimeout(openTimerRef.current)
      clearTimeout(closeTimerRef.current)
      setCardOpen(false)
    }
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [cardOpen])

  if (!account) return <span className={className}>{children}</span>

  const displayName = account.employeeName || account.name || name || 'this account'

  function cancelClose() {
    clearTimeout(closeTimerRef.current)
  }

  function scheduleOpen(event) {
    // Touch and pen keep tap-to-open; the card is a mouse-hover nicety.
    if (event.pointerType !== 'mouse') return
    cancelClose()
    if (cardOpen) return
    clearTimeout(openTimerRef.current)
    openTimerRef.current = setTimeout(() => setCardOpen(true), OPEN_DELAY_MS)
  }

  function scheduleClose() {
    clearTimeout(openTimerRef.current)
    cancelClose()
    closeTimerRef.current = setTimeout(() => setCardOpen(false), CLOSE_DELAY_MS)
  }

  function openFullProfile() {
    clearTimeout(openTimerRef.current)
    cancelClose()
    setCardOpen(false)
    if (onOpen) onOpen(account)
    else openProfile(account)
  }

  const open = (event) => {
    event.preventDefault()
    event.stopPropagation()
    openFullProfile()
  }

  const triggerProps = {
    ref: triggerRef,
    'aria-label': `View ${displayName}'s profile`,
    onClick: open,
    onPointerEnter: scheduleOpen,
    onPointerLeave: scheduleClose,
    className: `${LINK_CLASS} ${className}`,
  }

  const trigger = nested ? (
    <span
      {...triggerProps}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') open(event)
      }}
    >
      {children}
    </span>
  ) : (
    <button type="button" {...triggerProps}>
      {children}
    </button>
  )

  return (
    <>
      {trigger}
      {cardOpen ? (
        <ProfileHoverCard
          account={account}
          anchorRef={triggerRef}
          onPointerEnter={cancelClose}
          onPointerLeave={scheduleClose}
          onViewProfile={openFullProfile}
        />
      ) : null}
    </>
  )
}
