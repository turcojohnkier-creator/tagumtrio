import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, ShieldCheck, Users } from 'lucide-react'
import tagumtrioLogo from '../assets/tagumtrio-logo.jpg'
import bgImage from '../assets/pexels-mandiri-abadi-396768996-15016528.jpg'

const heroV = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const heroItemV = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } } }
const cardV = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } } }
const cardItemV = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }

export default function Landing() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Dark overlay */}
      <div className="flex min-h-screen flex-col bg-black/55">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">

          <header className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <img src={tagumtrioLogo} alt="Tagum Trio" className="h-9 w-9 rounded-lg object-cover" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">TriOPS</p>
                <p className="text-sm text-white/80">Production Operations System</p>
              </div>
            </div>
            <Link
              to="/login"
              className="rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Log in
            </Link>
          </header>

          <main className="flex flex-1 items-center justify-center py-16">
            <motion.section
              className="mx-auto w-full max-w-4xl text-center"
              variants={heroV} initial="hidden" animate="show"
            >
              <motion.div variants={heroItemV} className="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Tagum Trio Workflow
              </motion.div>

              <motion.h1 variants={heroItemV} className="mx-auto mt-6 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
                One flow for employees, leadman, production, HR, and GM.
              </motion.h1>

              <motion.p variants={heroItemV} className="mx-auto mt-5 max-w-2xl text-lg text-white/75">
                Daily production reports, approvals, and payroll visibility — all in one workflow built for Tagum Trio.
              </motion.p>

              <motion.div variants={heroItemV} className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/40 transition-colors hover:bg-emerald-500"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>

              <motion.div
                className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3"
                variants={cardV}
              >
                <motion.div variants={cardItemV} className="rounded-xl border border-white/15 bg-white/10 p-5 text-left backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">Role-secure access</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">Each user lands on their own tools and permissions.</p>
                </motion.div>
                <motion.div variants={cardItemV} className="rounded-xl border border-white/15 bg-white/10 p-5 text-left backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
                    <Users className="h-5 w-5 text-amber-300" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">Department ownership</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">Leadman handles only the department assigned at registration.</p>
                </motion.div>
                <motion.div variants={cardItemV} className="rounded-xl border border-white/15 bg-white/10 p-5 text-left backdrop-blur-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <BadgeCheck className="h-5 w-5 text-emerald-300" />
                  </div>
                  <p className="mt-4 text-sm font-semibold text-white">Approval chain</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">From daily reports to payroll-ready records with full verification.</p>
                </motion.div>
              </motion.div>
            </motion.section>
          </main>

        </div>
      </div>
    </div>
  )
}
