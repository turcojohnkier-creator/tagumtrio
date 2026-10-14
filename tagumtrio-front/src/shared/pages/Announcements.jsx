import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/auth-context'
import { useAppData } from '../../context/app-data-context'
import { formatRole } from '../../lib/roles'
import AnnouncementPost from '../ui/AnnouncementPost'
import PageHeader from '../ui/PageHeader'
import EmptyState from '../ui/EmptyState'

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

// Read-only announcements feed for every non-GM role. The backend already filters
// the list down to announcements targeted at the viewer's role.
export default function Announcements() {
  const { user, t } = useAuth()
  const { announcements = [], updateAnnouncement, markNotificationsSeen } = useAppData()

  useEffect(() => {
    markNotificationsSeen('announcement_new')
  }, [])

  function handleTogglePin(announcement) {
    updateAnnouncement(announcement.id, { pinned: !announcement.pinned }).catch(() => {})
  }

  const portalLabel = user?.role === 'employee'
    ? 'Employee Portal'
    : t(`role.${user?.role}`, formatRole(user?.role))

  return (
    <div className="space-y-6">
      <PageHeader tone="brand" eyebrow={portalLabel} title={t('nav.announcements', 'Announcements')} description="Company updates and notices." />

      {Array.isArray(announcements) && announcements.length > 0 ? (
        <motion.div className="space-y-4" variants={listVariants} initial="hidden" animate="show">
          {announcements.map((announcement) => (
            <motion.div key={announcement.id} variants={itemVariants}>
              <AnnouncementPost announcement={announcement} onTogglePin={handleTogglePin} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <EmptyState description={`No announcements yet for ${user?.department || 'your department'}.`} />
      )}
    </div>
  )
}
