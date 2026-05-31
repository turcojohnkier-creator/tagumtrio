import { LayoutDashboard, Factory, BarChart2, FileSpreadsheet, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQr } from '../../context/qr-context'
import { DEPARTMENTS } from '../../constants/departments'

export default function GMDashboard() {
  const { announcements = [] } = useQr()
  const departmentCount = DEPARTMENTS.length
  const announcementCount = announcements.length

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500">General Manager</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Analytics Overview</h1>
            <p className="mt-3 text-sm text-slate-400">
              This is your analytics home. Get quick insight into department staffing, reports, and workforce performance.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Departments</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-400">{departmentCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Announcements</p>
              <p className="mt-3 text-3xl font-semibold text-sky-400">{announcementCount}</p>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-white shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Insights</p>
              <p className="mt-3 text-3xl font-semibold text-white">Live trends</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Analytics dashboard</p>
                <p className="text-sm text-slate-400">Use these quick links to jump to production, daily reports, and workforce tracking.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm text-slate-300">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Live analytics
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <Link to="/app/production" className="rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-emerald-500/40 hover:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-3"><Factory className="h-5 w-5 text-emerald-400" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Production</p>
                    <p className="mt-2 text-lg font-semibold text-white">Floor output</p>
                  </div>
                </div>
              </Link>

              <Link to="/app/production/consolidated" className="rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-emerald-500/40 hover:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-sky-500/10 p-3"><FileSpreadsheet className="h-5 w-5 text-sky-400" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Daily Reports</p>
                    <p className="mt-2 text-lg font-semibold text-white">Review summaries</p>
                  </div>
                </div>
              </Link>

              <Link to="/app/gm/overview" className="rounded-3xl border border-slate-800 bg-slate-950 p-5 transition hover:border-emerald-500/40 hover:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-violet-500/10 p-3"><BarChart2 className="h-5 w-5 text-violet-400" /></div>
                  <div>
                    <p className="text-xs text-slate-400">Workforce</p>
                    <p className="mt-2 text-lg font-semibold text-white">Staffing trends</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Analytics spotlight</p>
                <p className="text-sm text-slate-400">Quick wins to keep your team aligned.</p>
              </div>
              <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-300">New</div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Department balance</p>
                <p className="mt-2">Check which teams need staffing attention and move employees where needed.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Reports cadence</p>
                <p className="mt-2">Review daily report submission and approve summaries for better visibility.</p>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">Announcements</p>
                <p className="text-sm text-slate-400">Latest messages and updates</p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-400">
                {announcementCount}
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {announcementCount === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">No announcements yet.</div>
              ) : (
                announcements.slice(0, 5).map((announcement) => (
                  <div key={announcement.id} className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                    <p className="text-sm font-semibold text-white">{announcement.title}</p>
                    {announcement.body && <p className="mt-2 text-sm text-slate-400">{announcement.body}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
            <p className="text-sm font-semibold text-white">Explore</p>
            <div className="mt-4 space-y-3">
              <Link to="/app/production" className="block rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-900">Production dashboard</Link>
              <Link to="/app/production/consolidated" className="block rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-900">Daily reports</Link>
              <Link to="/app/gm/overview" className="block rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-900">Workforce overview</Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
