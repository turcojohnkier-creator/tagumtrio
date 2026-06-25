import { createContext, useContext } from 'react'

export const AppDataContext = createContext(undefined)

export function useAppData() {
  const ctx = useContext(AppDataContext)
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider')
  return ctx
}

export default AppDataContext
