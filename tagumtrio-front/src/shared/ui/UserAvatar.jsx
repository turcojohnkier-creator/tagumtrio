import { useContext } from 'react'
import AppDataContext from '../../context/app-data-context'
import Avatar from './Avatar'

// Avatar for someone we only know by id and/or name (report submitters, report
// entries, leave requesters...). Looks their picture up in the loaded user list.
export default function UserAvatar({ userId, name, ...props }) {
  const appData = useContext(AppDataContext)
  const src = appData?.getAvatarFor?.(userId, name) || null
  return <Avatar name={name} src={src} {...props} />
}
