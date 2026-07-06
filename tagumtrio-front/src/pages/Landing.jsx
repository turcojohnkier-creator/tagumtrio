import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, ShieldCheck, Users } from 'lucide-react'
import tagumtrioLogo from '../assets/tagumtrio-logo.jpg'

export default function Landing() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-800">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={tagumtrioLogo} alt="Tagum Trio" className="h-9 w-9 rounded-lg object-cover" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">TriOPS</p>
              <p className="text-sm text-zinc-600">Production Operations System</p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Log in
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-16">
          <section className="mx-auto w-full max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Tagum Trio Workflow
            </div>

            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-zinc-900 sm:text-5xl">
              One flow for employees, leadman, production, HR, and GM.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600">
              Daily production reports, approvals, and payroll visibility — all in one workflow built for Tagum Trio.
            </p>

            <div className="mt-8">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-900">Role-secure access</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">Each user lands on their own tools and permissions.</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                  <Users className="h-5 w-5 text-amber-600" />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-900">Department ownership</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">Leadman handles only the department assigned at registration.</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                  <BadgeCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-4 text-sm font-semibold text-zinc-900">Approval chain</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">From daily reports to payroll-ready records with full verification.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
