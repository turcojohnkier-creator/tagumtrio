import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// Shared lock count so stacked portals (e.g. a confirm dialog opened on top of
// another modal) don't unlock body scroll while one of them is still open.
let scrollLockCount = 0
let previousBodyOverflow = ''

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

export default function Portal({ children }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    lockBodyScroll()
    return () => {
      setMounted(false)
      unlockBodyScroll()
    }
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
