import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { motion } from 'framer-motion'
import Portal from '../ui/Portal'
import Button from '../ui/Button'
import { useAuth } from '../../context/auth-context'

/**
 * Asks for the (required) reason before a report is returned down the chain.
 * Renders above the bundle/report modals. Mount it only while open so the
 * textarea starts empty each time.
 */
export default function ReturnReasonModal({ title, description, confirmLabel, label, placeholder, loading = false, onConfirm, onCancel }) {
  const { t } = useAuth()
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  return (
    <Portal>
      <div className="fixed inset-0 z-[95] overflow-y-auto p-4">
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onClick={loading ? undefined : onCancel}
        />
        <div className="relative flex min-h-full items-center justify-center">
          <motion.form
            className="relative z-10 w-full max-w-lg space-y-4 rounded-xl border border-rose-200 bg-white p-5 shadow-sm"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onSubmit={(event) => {
              event.preventDefault()
              if (trimmed && !loading) onConfirm(trimmed)
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <CircleAlert className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-zinc-900">{title}</h3>
                {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="return-reason" className="text-sm font-semibold text-rose-800">
                {label || t('report.return.reason_label', 'Reason for returning')}
              </label>
              <textarea
                id="return-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={placeholder || t('report.return.placeholder', 'Explain what needs to be checked or fixed…')}
                maxLength={1000}
                autoFocus
                className="min-h-[110px] w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/10"
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" className="btn-dismiss" disabled={loading} onClick={onCancel}>
                {t('report.return.cancel', 'Cancel')}
              </Button>
              <Button type="submit" variant="danger" disabled={!trimmed || loading}>
                {loading ? t('report.modal.working', 'Working...') : confirmLabel}
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </Portal>
  )
}
