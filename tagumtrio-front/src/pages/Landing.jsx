import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, QrCode, ShieldCheck, Users } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-emerald-50/60 text-zinc-800">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white/65 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500 p-2 shadow-lg shadow-emerald-500/25">
              <QrCode className="h-5 w-5 text-zinc-900" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-700">TriOPS</p>
              <p className="text-sm text-zinc-700">Production Operations System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-800 hover:border-zinc-300">Log in</Link>
          </div>
        </header>

        <main className="relative flex flex-1 items-center justify-center overflow-hidden py-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.22),transparent_56%),radial-gradient(ellipse_at_bottom,rgba(6,182,212,0.15),transparent_62%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] [background-size:28px_28px]" />

          <section className="relative z-10 mx-auto w-full max-w-5xl px-2 text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              Tagum Trio Workflow
            </div>

            <h1 className="mx-auto mt-6 max-w-4xl text-2xl font-semibold leading-tight text-zinc-900 sm:text-6xl">
              One flow for employees, leadman, Production In-Charge, HR/Admin, and GM.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-700">
              Daily production reports, approvals, leadman routing, and payroll visibility in one workflow built for Tagum Trio.
            </p>

            <div className="mx-auto mt-6 inline-flex rounded-full border border-zinc-300/80 bg-white/75 px-5 py-2 text-sm text-zinc-800 shadow-xl shadow-black/25">
              Quick Start: Tap Get Started, log in, and continue with your assigned role dashboard.
            </div>

            <div className="mt-8">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-8 py-3 text-base font-semibold text-black shadow-[0_10px_35px_rgba(16,185,129,0.35)] hover:brightness-110">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-4 text-left">
                <ShieldCheck className="h-5 w-5 text-cyan-700" />
                <p className="mt-3 text-sm font-medium text-zinc-900">Role-secure access</p>
                <p className="mt-1 text-xs text-zinc-500">Each user lands on their own tools and permissions.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-4 text-left">
                <Users className="h-5 w-5 text-amber-700" />
                <p className="mt-3 text-sm font-medium text-zinc-900">Department ownership</p>
                <p className="mt-1 text-xs text-zinc-500">Leadman handles only the department assigned at registration.</p>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white/80 p-4 text-left">
                <BadgeCheck className="h-5 w-5 text-emerald-700" />
                <p className="mt-3 text-sm font-medium text-zinc-900">Approval chain</p>
                <p className="mt-1 text-xs text-zinc-500">From scan to payroll-ready records with verification steps.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}