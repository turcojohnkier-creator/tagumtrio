import { createContext, useContext } from 'react'

const DEFAULT_VALUE = {
  canViewProfiles: false,
  findAccount: () => null,
  openProfile: () => {},
}

export const ProfileViewerContext = createContext(DEFAULT_VALUE)

// Opens the shared account profile from anywhere a person is listed.
// Outside the provider (or for employees) profiles simply aren't clickable.
export function useProfileViewer() {
  return useContext(ProfileViewerContext) || DEFAULT_VALUE
}
