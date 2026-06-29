export default function Card({ className = '', padding = 'p-6', children }) {
  return (
    <div className={`rounded-xl border border-emerald-100 bg-white shadow-sm ${padding} ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ icon: Icon, children, hint, action }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="flex items-center gap-2 font-heading text-base font-bold text-zinc-900">
          {Icon ? <Icon className="h-4.5 w-4.5 text-emerald-600" /> : null}
          {children}
        </h3>
        {hint ? <p className="mt-1 text-sm text-zinc-500">{hint}</p> : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  )
}
