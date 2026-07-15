import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Languages, Megaphone, MoreHorizontal, Pin, PinOff } from 'lucide-react'
import { useAuth } from '../../context/auth-context'
import { translateTextApi } from '../../lib/api'

function initials(name) {
  const parts = String(name || 'Tagum Trio').trim().split(/\s+/).filter(Boolean)
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
  const { user, language, t } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [translated, setTranslated] = useState(null)
  const [showTranslated, setShowTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')

  if (!announcement) return null

  const author = announcement.author || 'Management'
  const audience = announcement.audience || 'All employees'
  const originalBody = String(announcement.body || '').trim()
  const originalTitle = String(announcement.title || '').trim()
  const body = showTranslated && translated ? translated.body : originalBody
  const title = showTranslated && translated ? translated.title : originalTitle
  const isPinned = Boolean(announcement.pinned)
  const canTranslate = user?.role !== 'gm'

  async function handleTranslate() {
    if (showTranslated) {
      setShowTranslated(false)
      return
    }
    if (translated) {
      setShowTranslated(true)
      return
    }
    setTranslating(true)
    setTranslateError('')
    try {
      const target = language === 'zh' ? 'zh-CN' : 'en'
      const [titleResult, bodyResult] = await Promise.all([
        originalTitle ? translateTextApi(originalTitle, target) : Promise.resolve({ translated: '' }),
        originalBody ? translateTextApi(originalBody, target) : Promise.resolve({ translated: '' }),
      ])
      setTranslated({ title: titleResult.translated, body: bodyResult.translated })
      setShowTranslated(true)
    } catch (error) {
      setTranslateError(t('announcement.translate_failed'))
    } finally {
      setTranslating(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-start gap-4 border-b border-zinc-200 px-6 py-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">
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

        {canTranslate ? (
          <button
            type="button"
            onClick={handleTranslate}
            disabled={translating}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              showTranslated
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            {translating ? t('announcement.translating') : showTranslated ? t('announcement.show_original') : t('announcement.translate')}
          </button>
        ) : null}

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

          <AnimatePresence>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <motion.div
                  className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  style={{ transformOrigin: 'top right' }}
                >
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
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="px-6 py-5">
        {translateError ? (
          <p className="mb-2 text-sm text-rose-600">{translateError}</p>
        ) : null}
        {body ? (
          <p className="whitespace-pre-line text-sm leading-6 text-zinc-700">{body}</p>
        ) : (
          <p className="text-sm text-zinc-500">No message body provided.</p>
        )}
      </div>

    </article>
  )
}
