import { Users } from 'lucide-react'

export default function DepartmentCard({ department, onOpen }) {
  const name = department.name || department.department || 'Unknown'
  const count = department.activeCount ?? department.count ?? 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left shadow-2xl shadow-black/20 transition duration-200 hover:border-emerald-500/40 hover:bg-white"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500 opacity-40" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Department</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">{name}</h3>
        </div>
        <div className="rounded-3xl bg-white/80 px-4 py-2 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{count}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-white/70 px-4 py-3 text-sm font-medium text-slate-500">
        Tap the card to open the department roster.
      </div>
    </button>
  )
}
