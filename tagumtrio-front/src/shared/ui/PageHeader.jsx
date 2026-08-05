export default function PageHeader({ eyebrow, title, description, actions, children, tone = 'default' }) {
  const isBrand = tone === 'brand'
  // Some pages pass a translation lookup that resolves to a blank/whitespace
  // string (e.g. a missing key falling back to itself). Render nothing rather
  // than an empty line that still eats header height.
  const hasDescription = Boolean(description && String(description).trim())

  return (
    <div className={isBrand
      ? 'rounded-xl border border-emerald-700 bg-emerald-700 p-4 shadow-sm sm:p-6'
      : 'rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6'
    }>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          {eyebrow ? (
            <p className={isBrand
              ? 'inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white'
              : 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700'
            }>
              {eyebrow}
            </p>
          ) : null}
          <h1 className={isBrand
            ? 'font-heading text-lg font-bold text-white sm:text-2xl'
            : 'font-heading text-lg font-bold text-zinc-900 sm:text-2xl'
          }>{title}</h1>
          {hasDescription ? (
            <p className={isBrand
              ? 'hidden max-w-2xl text-sm text-emerald-50/90 sm:block'
              : 'hidden max-w-2xl text-sm text-zinc-500 sm:block'
            }>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 sm:gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="mt-4 sm:mt-5">{children}</div> : null}
    </div>
  )
}
