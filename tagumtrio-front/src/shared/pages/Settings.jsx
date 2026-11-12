import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, LogOut, UserCircle2 } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { changePasswordApi } from '../../lib/api'
import { formatRole } from '../../lib/roles'
import PageHeader from '../ui/PageHeader'
import Card, { SectionTitle } from '../ui/Card'
import Button from '../ui/Button'

const inputClassName = 'w-full rounded-xl border border-zinc-300 bg-zinc-50 py-3 pl-10 pr-12 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none'

function PasswordField({ label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <label className="text-sm text-zinc-700">{label}</label>
      <div className="relative mt-1.5">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          className={inputClassName}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, logout, t } = useAuth()
  const dialog = useDialog()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  function validate() {
    if (!currentPassword) return t('settings.err_current')
    if (!newPassword) return t('settings.err_new')
    if (newPassword.length < 6) return t('settings.err_short')
    if (new TextEncoder().encode(newPassword).length > 72) return t('settings.err_long')
    if (newPassword === currentPassword) return t('settings.err_same')
    if (newPassword !== confirmPassword) return t('settings.err_match')
    return ''
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    const message = validate()
    setFormError(message)
    if (message) return

    setSubmitting(true)
    try {
      await changePasswordApi({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      dialog.success({
        title: t('settings.password_updated'),
        message: t('settings.password_updated_message'),
      })
    } catch (error) {
      setFormError(error?.message || 'Unable to update password.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    const confirmed = await dialog.confirm({
      kicker: t('ui.sign_out'),
      title: t('settings.sign_out_title'),
      message: t('settings.sign_out_message'),
      confirmText: t('ui.sign_out'),
      cancelText: t('settings.stay_signed_in'),
    })
    if (!confirmed) return
    logout()
    navigate('/login')
  }

  const accountRows = [
    { label: t('settings.name'), value: user?.name },
    { label: t('settings.username'), value: user?.identifier },
    { label: t('settings.role'), value: t(`role.${user?.role}`, formatRole(user?.role)) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader tone="brand" title={t('settings.title')} description={t('settings.description')} />

      <Card>
        <SectionTitle icon={UserCircle2}>{t('settings.account')}</SectionTitle>
        <dl className="grid gap-4 sm:grid-cols-3">
          {accountRows.map((row) => (
            <div key={row.label} className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-zinc-400">{row.label}</dt>
              <dd className="mt-1 truncate text-sm font-medium text-zinc-900">{row.value || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <SectionTitle icon={KeyRound} hint={t('settings.change_password_hint')}>
          {t('settings.change_password')}
        </SectionTitle>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]">
              <PasswordField
                label={t('settings.current_password')}
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
              />
            </div>
            <PasswordField
              label={t('settings.new_password')}
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <PasswordField
              label={t('settings.confirm_password')}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
          </div>

          {formError ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          ) : null}

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? t('settings.saving') : t('settings.save_password')}
          </Button>
        </form>
      </Card>

      <Card>
        <SectionTitle icon={LogOut} hint={t('settings.session_hint')}>{t('settings.session')}</SectionTitle>
        <Button type="button" variant="dangerOutline" onClick={handleSignOut} className="w-full sm:w-auto">
          <LogOut className="h-4 w-4" />
          {t('ui.sign_out')}
        </Button>
      </Card>
    </div>
  )
}
