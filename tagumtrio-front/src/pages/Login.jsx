import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Lock, UserCircle2 } from 'lucide-react'
import { useAuth } from '../context/auth-context'

const LOGIN_PREFS_KEY = 'triops-login-prefs'

export default function Login() {
  const { loginWithCredentials } = useAuth()
  const navigate = useNavigate()
  const { language, setLanguage, t } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // ... (Keep your useEffect for localStorage as is)

  const validationMessage = useMemo(() => {
    if (!identifier.trim()) return 'Enter your work email or employee ID.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    return ''
  }, [identifier, password])

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (validationMessage) { setFormError(validationMessage); return }
    setSubmitting(true)

    loginWithCredentials({ identifier: identifier.trim(), password })
      .then((result) => {
        if (!result.ok) {
          setFormError(result.error || 'Unable to sign in.')
          setSubmitting(false)
          return
        }

        // ROLE-BASED REDIRECTION
        const role = result.user?.role;
        if (role === 'leadman') {
          navigate('/app/leadman', { replace: true });
        } else if (role === 'gm') {
          navigate('/app/gm', { replace: true });
        } else if (role === 'hr') {
          navigate('/app/hr/employees', { replace: true });
        } else {
          navigate('/app/portal', { replace: true });
        }
      })
      .catch((error) => {
        setFormError(error.message || 'Unable to sign in.')
        setSubmitting(false)
      })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030712] via-[#061225] to-[#0b1324] px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900/75 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(56,189,248,0.16),transparent_55%)]" />
            <div className="relative h-full p-10">
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">TriOPS Workforce</p>
              <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight text-white">Operations, attendance, and payroll in one production flow.</h1>
              <p className="mt-5 max-w-sm text-sm text-slate-300">Sign in with your registered account to access your dedicated dashboard and workflows.</p>

              <div className="mt-10 space-y-3 text-sm text-slate-200">
                <p className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">Department routing and approvals</p>
                <p className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">Live scan verification chain</p>
                <p className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3">Payroll and payslip visibility</p>
              </div>
            </div>
          </section>

          <section className="p-6 sm:p-8 md:p-10">
            <div className="flex justify-end">
              <div className="inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-2 py-1 rounded ${language === 'en' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300'}`}
                >EN</button>
                <button
                  type="button"
                  onClick={() => setLanguage('zh')}
                  className={`px-2 py-1 rounded ${language === 'zh' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300'}`}
                >中文</button>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-emerald-300 font-semibold">TriOPS</p>
              <h2 className="text-2xl font-bold text-white mt-1">{t('login.welcome')}</h2>
              <p className="mt-2 text-sm text-slate-400">{t('login.description')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm text-slate-300">{t('login.identifier')}</label>
                <div className="mt-1.5 relative">
                  <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g. leadman@triops.local or EMP-001"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300">{t('login.password')}</label>
                <div className="mt-1.5 relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-12 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  {t('login.remember')}
                </label>
                <button type="button" className="text-cyan-300 hover:text-cyan-200" onClick={() => setFormError(t('login.forgot') + ' Password reset will be connected to backend email flow.')}>{t('login.forgot')}</button>
              </div>

              {(formError || validationMessage) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{formError || validationMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || Boolean(validationMessage)}
                className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {submitting ? (language === 'zh' ? '登录中…' : 'Signing in...') : t('login.signin')}
              </button>

              <p className="text-center text-sm text-slate-400">
                Account creation is managed by HR. Please contact your administrator to provision access.
              </p>

              <p className="text-[11px] text-slate-500 text-center">
                Demo starter accounts still work: admin@triops.local, leadman@triops.local, employee@triops.local.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}