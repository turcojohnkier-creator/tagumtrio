import { createContext, useContext, useMemo, useState } from 'react'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'
import Portal from '../shared/ui/Portal'

const DialogContext = createContext(undefined)

function DialogModal({ dialog, onCancel, onConfirm, onClose }) {
  if (!dialog) return null

  const isConfirm = dialog.variant === 'confirm'
  const isSuccess = dialog.variant === 'success'
  const isError = dialog.variant === 'error'

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
        <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/60" onClick={isConfirm ? onCancel : onClose} />
        <div className="relative z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-2 ${isSuccess ? 'bg-emerald-500/10 text-emerald-700' : isError ? 'bg-rose-500/10 text-rose-700' : 'bg-cyan-500/10 text-cyan-700'}`}>
                {isSuccess ? <CheckCircle2 className="h-5 w-5" /> : isError ? <AlertTriangle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">{dialog.kicker || (isSuccess ? 'Success' : isError ? 'Error' : 'Confirm action')}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{dialog.title}</h3>
              </div>
            </div>
            <button type="button" onClick={isConfirm ? onCancel : onClose} className="text-slate-500 hover:text-slate-900">
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-700">{dialog.message}</p>

          <div className="mt-6 flex items-center justify-end gap-3">
            {isConfirm ? (
              <>
                <button type="button" onClick={onCancel} className="rounded-xl bg-slate-100 px-4 py-2.5 text-slate-800 transition-colors hover:bg-slate-200">
                  {dialog.cancelText || 'Cancel'}
                </button>
                <button type="button" onClick={onConfirm} className="rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400">
                  {dialog.confirmText || 'Confirm'}
                </button>
              </>
            ) : (
              <button type="button" onClick={onClose} className="rounded-xl bg-emerald-500 px-4 py-2.5 font-medium text-black transition-colors hover:bg-emerald-400">
                {dialog.confirmText || 'Okay'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  )
}

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null)

  const closeDialog = () => setDialog(null)

  const api = useMemo(() => ({
    confirm({ title, message, confirmText, cancelText = 'Cancel', kicker = 'Confirm action' }) {
      return new Promise((resolve) => {
        setDialog({
          variant: 'confirm',
          title,
          message,
          confirmText,
          cancelText,
          kicker,
          resolve,
        })
      })
    },
    success({ title, message, confirmText = 'Okay', kicker = 'Success' }) {
      setDialog({ variant: 'success', title, message, confirmText, kicker })
    },
    error({ title, message, confirmText = 'Okay', kicker = 'Something went wrong' }) {
      setDialog({ variant: 'error', title, message, confirmText, kicker })
    },
    close() {
      closeDialog()
    },
  }), [])

  function handleConfirm() {
    if (dialog?.resolve) dialog.resolve(true)
    closeDialog()
  }

  function handleCancel() {
    if (dialog?.resolve) dialog.resolve(false)
    closeDialog()
  }

  function handleClose() {
    closeDialog()
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      <DialogModal dialog={dialog} onConfirm={handleConfirm} onCancel={handleCancel} onClose={handleClose} />
    </DialogContext.Provider>
  )
}

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialog must be used inside DialogProvider')
  return context
}

export default DialogContext
