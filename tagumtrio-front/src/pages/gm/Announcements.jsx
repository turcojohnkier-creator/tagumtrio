import { useState } from 'react'
import { useQr } from '../../context/qr-context'
import { useAuth } from '../../context/auth-context'
import AnnouncementPost from '../../shared/ui/AnnouncementPost'

export default function Announcements() {
  const { announcements = [], createAnnouncement, updateAnnouncement, removeAnnouncement } = useQr()
  const { user, t } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingAnnouncementId, setEditingAnnouncementId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editPinned, setEditPinned] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!title) return
    setSubmitting(true)
    try {
      await createAnnouncement({ title, body, pinned, author: user?.name || 'Admin' })
      setTitle('')
      setBody('')
      setPinned(false)
    } catch (err) {
      console.error(err)
      alert('Failed to create announcement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">{t('gm.announce.title')}</h2>
        <p className="text-slate-400 mt-1">{t('gm.announce.desc')}</p>
      </div>

      <form onSubmit={handleCreate} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20">
        <div className="border-b border-slate-800 bg-slate-950/70 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t('gm.announce.create')}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{t('gm.announce.post')}</h3>
        </div>
        <div className="grid gap-4 p-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('gm.announce.what')} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder={t('gm.announce.body')} className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> {t('gm.announce.pin')}
          </label>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-500">{t('gm.announce.broadcast')}</span>
            <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-5 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400">{submitting ? t('gm.announce.posting') : t('gm.announce.publish')}</button>
          </div>
        </div>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{t('gm.announce.recent')}</h3>
        {announcements.length === 0 ? (
          <div className="text-sm text-slate-400">{t('gm.announce.no')}</div>
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
                        })
                        setEditingAnnouncementId(null)
                      } catch (err) {
                        console.error(err)
                        alert('Failed to save announcement')
                      } finally {
                        setEditSubmitting(false)
                      }
                    }}
                    className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-5"
                  >
                    <div className="grid gap-4">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder={t('gm.announce.ann_title')}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={4}
                        placeholder={t('gm.announce.ann_body')}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={editPinned} onChange={(e) => setEditPinned(e.target.checked)} /> {t('gm.announce.pin_top')}
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingAnnouncementId(null)}
                        className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
                      >
                        {t('gm.announce.cancel')}
                      </button>
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
                      >
                        {editSubmitting ? t('gm.announce.saving') : t('gm.announce.save')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <AnnouncementPost announcement={a} showActions={false} />
                    <div className="flex flex-wrap justify-end gap-3 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAnnouncementId(a.id)
                          setEditTitle(a.title || '')
                          setEditBody(a.body || '')
                          setEditPinned(Boolean(a.pinned))
                        }}
                        className="text-xs font-medium text-slate-200 transition-colors hover:text-white"
                      >
                        {t('gm.announce.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAnnouncement(a.id)}
                        className="text-xs font-medium text-rose-400 transition-colors hover:text-rose-300"
                      >
                        {t('gm.announce.delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
