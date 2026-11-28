import { ChevronRight, Users } from 'lucide-react'
import { useAuth } from '../../../context/auth-context'

// `attendanceOpen` is false outside work sessions (before 7 AM, lunch, after
// 6 PM) — nobody can be present then, so Present shows a dash instead of 0.
export default function DepartmentCard({ department, onOpen, attendanceOpen = false }) {
  const { t } = useAuth()
  const name = department.name || department.department || t('gm.modal.unknown')
  const employeeCount = department.employeeCount ?? 0
  const activeCount = department.activeCount ?? 0

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{t('gm.card.department')}</p>
            <h3 className="mt-0.5 font-heading text-lg font-bold text-zinc-900">{name}</h3>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <div className="rounded-lg bg-zinc-50 px-3 py-1.5 text-center ring-1 ring-inset ring-zinc-200">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{t('gm.card.employees')}</p>
            <p className="text-lg font-bold text-zinc-900">{employeeCount}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-1.5 text-center" title={attendanceOpen ? undefined : t('gm.attendance.locked')}>
            <p className="text-[10px] uppercase tracking-wide text-emerald-700/70">{t('gm.modal.active')}</p>
            <p className="text-lg font-bold text-emerald-700">{attendanceOpen ? activeCount : '—'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-500 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-700">
        {t('gm.card.view_roster')}
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  )
}
