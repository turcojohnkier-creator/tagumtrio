import { useEffect, useState } from 'react'

export default function PageTransition({ children, className = '' }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`transition-opacity duration-300 ease-out ${mounted ? 'opacity-100' : 'opacity-0'} ${className}`}>
      {children}
    </div>
  )
}
