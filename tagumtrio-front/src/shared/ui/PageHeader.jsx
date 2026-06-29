export default function PageHeader({ eyebrow, title, description, actions, children, tone = 'default' }) {
  const isBrand = tone === 'brand'

  return (
    <div className={isBrand
      ? 'rounded-xl border border-emerald-700 bg-emerald-700 p-6 shadow-sm'
      : 'rounded-xl border border-zinc-200 bg-white p-6 shadow-sm'
    }>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          {eyebrow ? (
            <p className={isBrand
              ? 'inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white'
              : 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'
            }>
              {eyebrow}
            </p>
          ) : null}
          <h1 className={isBrand
            ? 'font-heading text-xl font-bold text-white sm:text-2xl'
            : 'font-heading text-xl font-bold text-zinc-900 sm:text-2xl'
          }>{title}</h1>
          {description ? (
            <p className={isBrand ? 'max-w-2xl text-sm text-emerald-50/90' : 'max-w-2xl text-sm text-zinc-500'}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}
