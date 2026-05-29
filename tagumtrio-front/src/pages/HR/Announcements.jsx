import { useState } from 'react'
import { useQr } from '../../context/qr-context'
import { useAuth } from '../../context/auth-context'
import AnnouncementPost from '../../components/ui/AnnouncementPost'

export default function Announcements() {
  const { announcements = [], createAnnouncement, removeAnnouncement } = useQr()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
        <h2 className="text-2xl font-bold text-white">Announcements</h2>
        <p className="text-slate-400 mt-1">Broadcast Facebook-style posts to all employees.</p>
      </div>

      <form onSubmit={handleCreate} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg shadow-black/20">
        <div className="border-b border-slate-800 bg-slate-950/70 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Create broadcast</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Post to all employees</h3>
        </div>
        <div className="grid gap-4 p-5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the announcement?" className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write the post body..." className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none" />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top of employee feeds
          </label>
          <div className="flex items-center justify-end gap-3">
            <span className="text-xs uppercase tracking-[0.25em] text-slate-500">Broadcasted to all employees</span>
            <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-500 px-5 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400">{submitting ? 'Posting...' : 'Publish Post'}</button>
          </div>
        </div>
      </form>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent announcements</h3>
        {announcements.length === 0 ? (
          <div className="text-sm text-slate-400">No announcements yet.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="space-y-2">
                <AnnouncementPost announcement={a} showActions={false} />
                <div className="flex justify-end px-1">
                  <button onClick={() => removeAnnouncement(a.id)} className="text-xs font-medium text-rose-400 transition-colors hover:text-rose-300">Delete post</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
