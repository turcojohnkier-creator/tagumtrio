const variantClasses = {
  primary: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:hover:bg-emerald-600',
  secondary: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 disabled:hover:bg-zinc-100',
  outline: 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 disabled:hover:bg-white',
  ghost: 'text-zinc-600 hover:bg-zinc-100 disabled:hover:bg-transparent',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:hover:bg-rose-600',
}

const sizeClasses = {
  sm: 'gap-1.5 rounded-md px-3 py-1.5 text-sm',
  md: 'gap-2 rounded-lg px-4 py-2.5 text-sm',
  lg: 'gap-2 rounded-lg px-5 py-3 text-base',
}

export function buttonClassName({ variant = 'primary', size = 'md', className = '' }) {
  return [
    'inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    className,
  ].filter(Boolean).join(' ')
}
