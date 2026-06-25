const variantClasses = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  neutral: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
}

export default function Badge({ variant = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${variantClasses[variant] || variantClasses.neutral} ${className}`}>
      {children}
    </span>
  )
}
