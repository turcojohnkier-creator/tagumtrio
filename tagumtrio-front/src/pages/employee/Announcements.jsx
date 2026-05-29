import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import AnnouncementPost from '../../components/ui/AnnouncementPost'

export default function EmployeeAnnouncements() {
  const { user } = useAuth()
  const { announcements = [] } = useQr()

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Employee Portal</p>
        <h2 className="mt-2 text-2xl font-bold text-white">Announcements</h2>
        <p className="mt-1 text-sm text-slate-400">Company updates and notices for employees.</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        {Array.isArray(announcements) && announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementPost key={announcement.id} announcement={announcement} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 text-sm text-slate-400">
            No announcements yet for {user?.department || 'your department'}.
          </div>
        )}
      </div>
    </div>
  )
}
