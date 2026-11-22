import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Camera, Database, Download, Eye, EyeOff, KeyRound, Lock, LogOut, Trash2, Upload, UserCircle2 } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import { changePasswordApi, deleteAvatarApi, downloadDatabaseBackupApi, restoreDatabaseApi, uploadAvatarApi } from '../../lib/api'
import { makeAvatarDataUrl } from '../../lib/image'
import { formatRole } from '../../lib/roles'
import PageHeader from '../ui/PageHeader'
import Card, { SectionTitle } from '../ui/Card'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'

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

// Philippine time, matching the rest of the app: triops-backup-20261123-1405.json.gz
function backupFileName() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map((part) => [part.type, part.value])
  )
  return `triops-backup-${parts.year}${parts.month}${parts.day}-${parts.hour}${parts.minute}.json.gz`
}

// GM only: download the whole database as one file, or replace it with one.
// Lets data move between the deployed and a local database in either direction.
function DatabaseBackupCard({ t, dialog }) {
  const [busy, setBusy] = useState('')
  const restoreInputRef = useRef(null)

  async function handleDownload() {
    setBusy('download')
    try {
      const blob = await downloadDatabaseBackupApi()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backupFileName()
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      dialog.error({ title: t('settings.backup_download_failed', 'Backup failed'), message: error.message })
    } finally {
      setBusy('')
    }
  }

  async function handleRestoreSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const confirmed = await dialog.confirm({
      kicker: t('settings.backup_restore_kicker', 'Replace all data'),
      title: t('settings.backup_restore_confirm_title', 'Restore the database from this file?'),
      message: t(
        'settings.backup_restore_confirm_message',
        `Everything currently on this server (accounts, reports, payroll, attendance, announcements) will be deleted and replaced with the contents of "${file.name}". This cannot be undone. Download a backup first if you might need the current data.`
      ),
      confirmText: t('settings.backup_restore_confirm', 'Replace everything'),
    })
    if (!confirmed) return
    setBusy('restore')
    try {
      const result = await restoreDatabaseApi(file)
      const counts = result?.restored || {}
      const total = Object.values(counts).reduce((sum, n) => sum + Number(n || 0), 0)
      dialog.success({
        title: t('settings.backup_restore_done', 'Database restored'),
        message: `${total} ${t('settings.backup_restore_records', 'records restored')} (${counts.users ?? 0} ${t('settings.backup_restore_accounts', 'accounts')}, ${counts.daily_reports ?? 0} ${t('settings.backup_restore_reports', 'reports')}). ${t('settings.backup_restore_reload', 'Reloading the page…')}`,
      })
      // Everything on screen is now stale; reload once the message has been seen.
      setTimeout(() => window.location.reload(), 3000)
      return
    } catch (error) {
      dialog.error({ title: t('settings.backup_restore_failed', 'Restore failed'), message: error.message })
    } finally {
      setBusy('')
    }
  }

  return (
    <Card>
      <SectionTitle
        icon={Database}
        hint={t('settings.backup_hint', 'Download all data as one file, or replace all data on this server with a backup file. The file includes every account, so keep it private.')}
      >
        {t('settings.backup_title', 'Database backup')}
      </SectionTitle>
      <input
        ref={restoreInputRef}
        type="file"
        accept=".gz,.json,application/gzip,application/json"
        className="hidden"
        onChange={handleRestoreSelected}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" disabled={Boolean(busy)} onClick={handleDownload} className="w-full sm:w-auto">
          <Download className="h-4 w-4" />
          {busy === 'download' ? t('settings.backup_downloading', 'Preparing backup…') : t('settings.backup_download', 'Download backup')}
        </Button>
        <Button type="button" variant="dangerOutline" disabled={Boolean(busy)} onClick={() => restoreInputRef.current?.click()} className="w-full sm:w-auto">
          <Upload className="h-4 w-4" />
          {busy === 'restore' ? t('settings.backup_restoring', 'Restoring…') : t('settings.backup_restore', 'Restore from file')}
        </Button>
      </div>
    </Card>
  )
}

export default function Settings() {
  const { user, logout, updateUser, t } = useAuth()
  const dialog = useDialog()
  const navigate = useNavigate()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [avatarBusy, setAvatarBusy] = useState(false)
  const fileInputRef = useRef(null)

  async function handleAvatarSelected(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      dialog.error({ title: t('settings.photo_failed'), message: t('settings.photo_not_image') })
      return
    }
    setAvatarBusy(true)
    try {
      const dataUrl = await makeAvatarDataUrl(file)
      const updated = await uploadAvatarApi(dataUrl)
      updateUser(updated)
      dialog.success({ title: t('settings.photo_updated'), message: t('settings.photo_updated_message') })
    } catch (error) {
      dialog.error({ title: t('settings.photo_failed'), message: error?.message || t('settings.photo_failed') })
    } finally {
      setAvatarBusy(false)
    }
  }

  async function handleAvatarRemove() {
    const confirmed = await dialog.confirm({
      kicker: t('settings.photo'),
      title: t('settings.photo_remove_title'),
      message: t('settings.photo_remove_message'),
      confirmText: t('settings.photo_remove'),
      cancelText: t('ui.cancel', 'Cancel'),
    })
    if (!confirmed) return
    setAvatarBusy(true)
    try {
      const updated = await deleteAvatarApi()
      updateUser({ ...updated, avatar_url: null })
    } catch (error) {
      dialog.error({ title: t('settings.photo_failed'), message: error?.message || t('settings.photo_failed') })
    } finally {
      setAvatarBusy(false)
    }
  }

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
        <div className="mb-6 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Avatar name={user?.name} src={user?.avatar_url} size="2xl" className="bg-emerald-100 text-emerald-800 ring-4 ring-emerald-50" />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <p className="text-sm font-medium text-zinc-900">{t('settings.photo')}</p>
            <p className="text-xs text-zinc-500">{t('settings.photo_hint')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarSelected}
              />
              <Button type="button" size="sm" disabled={avatarBusy} onClick={() => fileInputRef.current?.click()}>
                <Camera className="h-4 w-4" />
                {avatarBusy ? t('settings.photo_saving') : user?.avatar_url ? t('settings.photo_change') : t('settings.photo_upload')}
              </Button>
              {user?.avatar_url ? (
                <Button type="button" size="sm" variant="outline" disabled={avatarBusy} onClick={handleAvatarRemove}>
                  <Trash2 className="h-4 w-4" />
                  {t('settings.photo_remove')}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
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

      {user?.role === 'gm' ? <DatabaseBackupCard t={t} dialog={dialog} /> : null}

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
