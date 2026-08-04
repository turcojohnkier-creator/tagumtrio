import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, Lock, UserCircle2 } from 'lucide-react'
import { useAuth } from '../context/auth-context'
import tagumtrioLogo from '../assets/tagumtrio-logo.jpg'
import bgImage from '../assets/pexels-andrew-wells-313813-14341184.jpg'

function roleHomePath(role) {
  if (role === 'leadman') return '/app/leadman'
  if (role === 'gm') return '/app/gm'
  if (role === 'hr') return '/app/hr/employees'
  return '/app/portal'
}

export default function Login() {
  const { user, loginWithCredentials, language, setLanguage, t } = useAuth()
  const navigate = useNavigate()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Already signed in (e.g. this tab was opened fresh but another tab, or a
  // remembered session, is still logged in) — skip the form and go straight in.
  useEffect(() => {
    if (user) navigate(roleHomePath(user.role), { replace: true })
  }, [user, navigate])

  const validationMessage = useMemo(() => {
    if (!identifier.trim()) return t('login.validation_username')
    if (password.length < 6) return t('login.validation_password')
    return ''
  }, [identifier, password, t])

  function handleSubmit(event) {
    event.preventDefault()
    setFormError('')
    if (validationMessage) { setFormError(validationMessage); return }
    setSubmitting(true)

    loginWithCredentials({ identifier: identifier.trim(), password, remember: rememberMe })
      .then((result) => {
        if (!result.ok) {
          setFormError(result.error || t('login.error_generic'))
          setSubmitting(false)
          return
        }

        navigate(roleHomePath(result.user?.role), { replace: true })
      })
      .catch((error) => {
        setFormError(error.message || t('login.error_generic'))
        setSubmitting(false)
      })
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-no-repeat px-4 py-10"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className="grid lg:grid-cols-2">

          {/* Left — brand panel */}
          <section className="hidden flex-col justify-between bg-emerald-700 p-10 lg:flex">
            <div>
              <div className="flex items-center gap-3">
                <img src={tagumtrioLogo} alt="Tagum Trio" className="h-10 w-10 rounded-lg object-cover shadow-lg" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Tagum Trio Lumber Corporation</p>
                  <p className="text-sm font-medium text-white">Production Operations System</p>
                </div>
              </div>

              <h2 className="mt-8 max-w-xs text-2xl font-bold leading-snug text-white">
                {t('login.hero_title')}
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-emerald-100">
                {t('login.hero_desc')}
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {[t('login.hero_feature1'), t('login.hero_feature2'), t('login.hero_feature3')].map((feature) => (
                <div key={feature} className="flex items-center gap-3 rounded-lg bg-emerald-600/50 px-4 py-3">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
                  <p className="text-sm text-white">{feature}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Right — form panel */}
          <section className="flex flex-col justify-center p-8 sm:p-10">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Tagum Trio Lumber Corporation</p>
                <h2 className="mt-1 text-2xl font-bold text-zinc-900">{t('login.welcome')}</h2>
                <p className="mt-1.5 text-sm text-zinc-500">{t('login.description')}</p>
              </div>
              <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${language === 'en' ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('zh')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${language === 'zh' ? 'bg-emerald-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                >
                  中文
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">{t('login.identifier')}</label>
                <div className="relative">
                  <UserCircle2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder={t('login.username_placeholder')}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-700">{t('login.password')}</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder={t('login.password_placeholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition-colors hover:text-zinc-700"
                    aria-label={showPassword ? t('login.hide_password') : t('login.show_password')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {t('login.remember')}
                </label>
                <button
                  type="button"
                  className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-900"
                  onClick={() => setFormError(`${t('login.forgot')} ${t('login.forgot_note')}`)}
                >
                  {t('login.forgot')}
                </button>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || Boolean(validationMessage)}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {submitting ? t('login.signing_in') : t('login.signin')}
              </button>

              <p className="text-center text-xs leading-relaxed text-zinc-400">
                {t('login.hr_note')}
              </p>
            </form>
          </section>

        </div>
      </motion.div>
    </div>
  )
}
