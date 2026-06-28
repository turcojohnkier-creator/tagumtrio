import { useEffect } from 'react'
import { useAuth } from '../../../context/auth-context'
import { useAppData } from '../../../context/app-data-context'
import AnnouncementPost from '../../../shared/ui/AnnouncementPost'
import PageHeader from '../../../shared/ui/PageHeader'
import Card from '../../../shared/ui/Card'
import EmptyState from '../../../shared/ui/EmptyState'

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
      <PageHeader eyebrow="Employee Portal" title="Announcements" description="Company updates and notices for employees." />

      <Card>
        {Array.isArray(announcements) && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementPost key={announcement.id} announcement={announcement} onTogglePin={handleTogglePin} />
            ))}
          </div>
        ) : (
          <EmptyState description={`No announcements yet for ${user?.department || 'your department'}.`} />
        )}
      </Card>
    </div>
  )
}
