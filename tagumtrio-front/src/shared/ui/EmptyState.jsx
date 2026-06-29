export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-10 text-center ${className}`}>
      {Icon ? (
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-400 ring-1 ring-zinc-200">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      {title ? <p className="text-sm font-medium text-zinc-700">{title}</p> : null}
      {description ? <p className="max-w-sm text-sm text-zinc-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
