import { useState } from 'react'
import { useAppData } from '../../../context/app-data-context'
import { useAuth } from '../../../context/auth-context'
import AnnouncementPost from '../../../shared/ui/AnnouncementPost'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'

const ROLE_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  { key: 'leadman', label: 'Leadman' },
  { key: 'gm', label: 'General Manager' },
  { key: 'hr', label: 'Human Resource' },
  { key: 'production_incharge', label: 'Production In-Charge' },
]

function RoleTargetPicker({ selected, onChange }) {
  const { t } = useAuth()

  function toggleRole(roleKey) {
    if (selected.includes(roleKey)) {
      onChange(selected.filter((role) => role !== roleKey))
    } else {
      onChange([...selected, roleKey])
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{t('gm.announce.visible_to')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([])}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selected.length === 0 ? 'bg-emerald-600 text-white shadow-sm' : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}
        >
          {t('gm.announce.all_roles')}
        </button>
        {ROLE_OPTIONS.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => toggleRole(role.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${selected.includes(role.key) ? 'bg-emerald-600 text-white shadow-sm' : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300'}`}
          >
            {t(`role.${role.key}`, role.label)}
          </button>
        ))}
      </div>
    </div>
  )
}

function targetRolesLabel(targetRoles, t) {
  if (!Array.isArray(targetRoles) || targetRoles.length === 0) return t('gm.announce.all_roles')
  return targetRoles
    .map((roleKey) => t(`role.${roleKey}`, ROLE_OPTIONS.find((role) => role.key === roleKey)?.label || roleKey))
    .join(', ')
}

export default function Announcements() {
  const { announcements = [], createAnnouncement, updateAnnouncement, removeAnnouncement } = useAppData()
  const { user, t } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [targetRoles, setTargetRoles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editPinned, setEditPinned] = useState(false)
  const [editTargetRoles, setEditTargetRoles] = useState([])
  const [editSubmitting, setEditSubmitting] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!title) return
    setSubmitting(true)
    try {
      await createAnnouncement({ title, body, pinned, author: user?.name || 'Admin', targetRoles })
      setTitle('')
      setBody('')
      setPinned(false)
      setTargetRoles([])
    } catch (err) {
      console.error(err)
      alert('Failed to create announcement')
    } finally {
      setSubmitting(false)
    }
  }

  function handleTogglePin(announcement) {
    updateAnnouncement(announcement.id, { pinned: !announcement.pinned }).catch(() => {})
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('gm.announce.title')} description={t('gm.announce.desc')} />

      <form onSubmit={handleCreate} className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-zinc-400">{t('gm.announce.create')}</p>
          <h3 className="mt-1 font-heading text-lg font-bold text-zinc-900">{t('gm.announce.post')}</h3>
        </div>
        <div className="grid gap-4 p-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('gm.announce.what')} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder={t('gm.announce.body')} className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none" />
          <RoleTargetPicker selected={targetRoles} onChange={setTargetRoles} />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> {t('gm.announce.pin')}
          </label>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs uppercase tracking-wide text-zinc-400">{t('gm.announce.broadcast')}</span>
            <Button type="submit" disabled={submitting}>{submitting ? t('gm.announce.posting') : t('gm.announce.publish')}</Button>
          </div>
        </div>
      </form>

      <Card>
        <h3 className="font-heading text-lg font-bold text-zinc-900 mb-4">{t('gm.announce.recent')}</h3>
        {announcements.length === 0 ? (
          <EmptyState title={t('gm.announce.no')} />
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="space-y-2">
                {editingAnnouncementId === a.id ? (
                  <form
                    onSubmit={async (event) => {
                      event.preventDefault()
                      setEditSubmitting(true)
                      try {
                        await updateAnnouncement(a.id, {
                          title: editTitle,
                          body: editBody,
                          pinned: editPinned,
                          targetRoles: editTargetRoles,
                        })
                        setEditingAnnouncementId(null)
                      } catch (err) {
                        console.error(err)
                        alert('Failed to save announcement')
                      } finally {
                        setEditSubmitting(false)
                      }
                    }}
                    className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5"
                  >
                    <div className="grid gap-4">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder={t('gm.announce.ann_title')}
                        className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:outline-none"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={4}
                        placeholder={t('gm.announce.ann_body')}
                        className="w-full rounded-xl border border-zinc-200 bg-white shadow-sm px-4 py-3 text-zinc-900 focus:border-emerald-500 focus:outline-none"
                      />
                      <RoleTargetPicker selected={editTargetRoles} onChange={setEditTargetRoles} />
                      <label className="flex items-center gap-2 text-sm text-zinc-700">
                        <input type="checkbox" checked={editPinned} onChange={(e) => setEditPinned(e.target.checked)} /> {t('gm.announce.pin_top')}
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingAnnouncementId(null)}
                      >
                        {t('gm.announce.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={editSubmitting}
                      >
                        {editSubmitting ? t('gm.announce.saving') : t('gm.announce.save')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <>
                    <AnnouncementPost announcement={a} showActions={false} onTogglePin={handleTogglePin} />
                    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                      <span className="text-xs text-zinc-400">{t('gm.announce.visible_to')}: {targetRolesLabel(a.targetRoles, t)}</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAnnouncementId(a.id)
                            setEditTitle(a.title || '')
                            setEditBody(a.body || '')
                            setEditPinned(Boolean(a.pinned))
                            setEditTargetRoles(Array.isArray(a.targetRoles) ? a.targetRoles : [])
                          }}
                          className="text-xs font-medium text-zinc-800 transition-colors hover:text-zinc-900"
                        >
                          {t('gm.announce.edit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAnnouncement(a.id)}
                          className="text-xs font-medium text-rose-700 transition-colors hover:text-rose-700"
                        >
                          {t('gm.announce.delete')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
