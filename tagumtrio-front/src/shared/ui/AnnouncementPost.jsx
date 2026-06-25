import { useState } from 'react'
import { Megaphone, MoreHorizontal, Pin, PinOff } from 'lucide-react'

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

export default function AnnouncementPost({ announcement, compact = false, showActions = false, onTogglePin }) {
  const [menuOpen, setMenuOpen] = useState(false)

  if (!announcement) return null

  const author = announcement.author || 'Management'
  const audience = announcement.audience || 'All employees'
  const body = String(announcement.body || '').trim()
  const title = String(announcement.title || '').trim()
  const isPinned = Boolean(announcement.pinned)

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-lg shadow-black/20">
      <div className="flex items-start gap-4 border-b border-zinc-200/80 bg-white/60 px-5 py-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-sm font-semibold text-black shadow-lg shadow-emerald-500/20">
          {initials(author)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold text-zinc-900`}>{title || 'Announcement'}</h3>
            {isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                <Pin className="h-3 w-3" /> Pinned
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-medium text-zinc-700">{author}</span>
            <span>•</span>
            <span>{formatTime(announcement.createdAt)}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
              <Megaphone className="h-3 w-3" /> {audience}
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full border border-zinc-200 bg-white p-2 text-zinc-400 transition-colors hover:text-zinc-900"
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    onTogglePin?.(announcement)
                    setMenuOpen(false)
                  }}
                  disabled={!onTogglePin}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  {isPinned ? 'Unpin announcement' : 'Pin announcement'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="px-5 py-4">
        {body ? (
          <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">{body}</p>
        ) : (
          <p className="text-sm text-zinc-500">No message body provided.</p>
        )}
      </div>

    </article>
  )
}
