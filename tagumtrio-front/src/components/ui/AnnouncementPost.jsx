import { Megaphone, MoreHorizontal, Pin } from 'lucide-react'

function initials(name) {
  const parts = String(name || 'TriOPS').trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || 'T'
  const second = parts[1]?.[0] || parts[0]?.[1] || 'R'
  return `${first}${second}`.toUpperCase()
}

function formatTime(value) {
  if (!value) return 'Recently posted'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently posted'
  return date.toLocaleString()
}

export default function AnnouncementPost({ announcement, compact = false, showActions = false }) {
  if (!announcement) return null

  const author = announcement.author || 'Management'
  const audience = announcement.audience || 'All employees'
  const body = String(announcement.body || '').trim()
  const title = String(announcement.title || '').trim()

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-lg shadow-black/20">
      <div className="flex items-start gap-4 border-b border-slate-800/80 bg-slate-900/60 px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-sm font-bold text-black shadow-lg shadow-emerald-500/20">
          {initials(author)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-white`}>{title || 'Announcement'}</h3>
            {announcement.pinned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-300">{author}</span>
            <span>•</span>
            <span>{formatTime(announcement.createdAt)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <Megaphone className="h-3 w-3" /> {audience}
            </span>
          </div>
        </div>
        <button type="button" className="rounded-full border border-slate-800 bg-slate-900 p-2 text-slate-500 transition-colors hover:text-white" aria-label="More options">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 py-4">
        {body ? (
          <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{body}</p>
        ) : (
          <p className="text-sm text-slate-400">No message body provided.</p>
        )}
      </div>

    </article>
  )
}
