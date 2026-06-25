export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          {eyebrow ? (
            <p className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-heading text-xl font-bold text-zinc-900 sm:text-2xl">{title}</h1>
          {description ? <p className="max-w-2xl text-sm text-zinc-500">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
