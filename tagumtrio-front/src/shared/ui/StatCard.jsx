export default function StatCard({ label, value, hint, icon: Icon, highlight = false }) {
  if (highlight) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm ring-1 ring-emerald-100 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/70">{label}</p>
          {Icon ? <Icon className="h-4 w-4 text-emerald-600" /> : null}
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums text-emerald-700">{value}</p>
        {hint ? <p className="mt-1 text-sm text-zinc-500">{hint}</p> : null}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{label}</p>
        {Icon ? <Icon className="h-4 w-4 text-zinc-400" /> : null}
      </div>
      <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
      {hint ? <p className="mt-1 text-sm text-zinc-500">{hint}</p> : null}
    </div>
  )
}
