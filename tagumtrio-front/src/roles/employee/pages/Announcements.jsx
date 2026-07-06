import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import AnnouncementPost from '../../../shared/ui/AnnouncementPost'
import PageHeader from '../../../shared/ui/PageHeader'
import EmptyState from '../../../shared/ui/EmptyState'

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

export default function EmployeeAnnouncements() {
  const { user } = useAuth()
  const { announcements = [], updateAnnouncement, markNotificationsSeen } = useAppData()

  useEffect(() => {
    markNotificationsSeen('announcement_new')
  }, [])

  function handleTogglePin(announcement) {
    updateAnnouncement(announcement.id, { pinned: !announcement.pinned }).catch(() => {})
  }

  return (
    <div className="space-y-6">
      <PageHeader tone="brand" eyebrow="Employee Portal" title="Announcements" description="Company updates and notices for employees." />

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
