import { useState } from 'react'
import { resolveAvatarUrl } from '../../lib/api'
import { getInitials } from './initials'

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ')
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-xl',
  '2xl': 'h-24 w-24 text-2xl',
}

// A user's profile picture, falling back to their initials when they haven't
// uploaded one (or the image fails to load). `className` sets the fallback's
// background/text colour and any ring; it applies to both cases.
export default function Avatar({
  name,
  src,
  size = 'md',
  className = 'bg-emerald-100 text-emerald-800',
  rounded = 'rounded-full',
}) {
  const url = resolveAvatarUrl(src)
  const [failedUrl, setFailedUrl] = useState(null)
  const showImage = url && failedUrl !== url

  return (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-bold',
        rounded,
        SIZES[size] || size,
        className,
      )}
      title={name || undefined}
    >
      {showImage ? (
        <img
          src={url}
          alt={name ? `${name}'s profile picture` : 'Profile picture'}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  )
}
