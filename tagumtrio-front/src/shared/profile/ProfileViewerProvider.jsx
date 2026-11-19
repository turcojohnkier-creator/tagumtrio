import { useCallback, useMemo, useState } from 'react'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { ProfileViewerContext } from './profile-viewer-context'
import EmployeeProfileModal from './EmployeeProfileModal'

function accountId(account) {
  return account?.employeeId ?? account?.id ?? account?.employee_id
}

function isBlank(value) {
  return value === undefined || value === null || value === ''
}

// Everyone except employees can open any listed person's profile. The profile
// always shows the live account record, so edits (archive, reassignment) made
// elsewhere show up while it is open.
export default function ProfileViewerProvider({ children }) {
  const { user } = useAuth()
  const { employees = [] } = useAppData()
  const [openId, setOpenId] = useState(null)

  const canViewProfiles = Boolean(user) && String(user.role || '').toLowerCase() !== 'employee'

  const findAccount = useCallback((userId, name) => {
    const list = Array.isArray(employees) ? employees : []
    if (!isBlank(userId)) {
      const byId = list.find((account) => String(accountId(account)) === String(userId))
      if (byId) return byId
    }
    const normalizedName = String(name || '').trim().toLowerCase()
    if (!normalizedName) return null
    const byName = list.filter((account) => String(account.employeeName || account.name || '').trim().toLowerCase() === normalizedName)
    // Two people sharing a name can't be told apart without an id.
    return byName.length === 1 ? byName[0] : null
  }, [employees])

  const openProfile = useCallback((account) => {
    const id = accountId(account)
    if (canViewProfiles && !isBlank(id)) setOpenId(id)
  }, [canViewProfiles])

  const closeProfile = useCallback(() => setOpenId(null), [])

  const value = useMemo(
    () => ({ canViewProfiles, findAccount, openProfile }),
    [canViewProfiles, findAccount, openProfile]
  )

  const openAccount = canViewProfiles && openId !== null ? findAccount(openId) : null

  return (
    <ProfileViewerContext.Provider value={value}>
      {children}
      {openAccount ? <EmployeeProfileModal employee={openAccount} onClose={closeProfile} /> : null}
    </ProfileViewerContext.Provider>
  )
}
