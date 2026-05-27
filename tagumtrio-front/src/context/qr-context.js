import { createContext, useContext } from 'react'

export const QRContext = createContext(undefined)

export function useQr() {
  const ctx = useContext(QRContext)
  if (!ctx) throw new Error('useQr must be used inside QRProvider')
  return ctx
}

export default QRContext
