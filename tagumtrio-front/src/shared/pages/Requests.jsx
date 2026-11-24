import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAppData } from '../../context/app-data-context'
import { useAuth } from '../../context/auth-context'
import { useDialog } from '../../context/dialog-context'
import PageHeader from '../ui/PageHeader'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import Avatar from '../ui/Avatar'
import ProfileLink from '../profile/ProfileLink'
import ReturnReasonModal from '../reports/ReturnReasonModal'

const STATUS_TABS = ['pending', 'approved', 'rejected']

function leaveDurationDays(req) {
  const startDate = req.startDate || req.start_date
  const endDate = req.endDate || req.end_date
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null
  const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  if (days <= 0) return null
  return days
}

export default function Requests() {
  const { leaveRequests = [], approveLeaveRequest, rejectLeaveRequest, formatDateTime, markNotificationsSeen, getAvatarFor } = useAppData()
  const { user, t } = useAuth()
  const dialog = useDialog()

  useEffect(() => {
    markNotificationsSeen('leave_request_new')
  }, [])

  const [statusTab, setStatusTab] = useState('pending')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejecting, setRejecting] = useState(false)

  const canApprove = user && ['leadman', 'production_incharge', 'hr', 'admin', 'gm'].includes(user.role)

  const filteredRequests = useMemo(
    () => (Array.isArray(leaveRequests) ? leaveRequests : []).filter((req) => String(req.status || '').toLowerCase() === statusTab),
    [leaveRequests, statusTab]
  )

  if (user?.role === 'hr') {
    return <Navigate to="/app/hr" replace />
  }

  function requestName(req) {
    return req.employeeName || req.employee_name
  }

  function leaveTypeLabel(req) {
    const type = req.leaveType || req.leave_type
    if (!type) return type
    return t(`leave.type_${String(type).toLowerCase()}`, type)
  }

  function durationLabel(req) {
    const days = leaveDurationDays(req)
    if (!days) return null
    return days === 1 ? t('requests.one_day') : `${days} ${t('requests.days')}`
  }

  async function handleApprove(req) {
    const confirmed = await dialog.confirm({
      kicker: t('ui.confirm_action'),
      title: t('requests.approve_confirm_title'),
      message: t('requests.approve_confirm_msg').replace('{name}', requestName(req)),
      confirmText: t('requests.yes_approve'),
      cancelText: t('requests.no'),
    })
    if (!confirmed) return

    try {
      await approveLeaveRequest(req.id, user?.id)
      dialog.success({
        kicker: t('ui.success'),
        title: t('requests.approved_title'),
        message: t('requests.approved_msg').replace('{name}', requestName(req)),
      })
    } catch (e) {
      console.error(e)
      dialog.error({
        kicker: t('ui.error'),
        title: t('requests.approve_failed_title'),
        message: t('requests.approve_failed_msg'),
      })
    }
  }

  // The reason modal doubles as the confirmation step; a reason is required.
  async function handleReject(req, reason) {
    setRejecting(true)
    try {
      await rejectLeaveRequest(req.id, user?.id, reason)
      setRejectTarget(null)
      dialog.success({
        kicker: t('ui.success'),
        title: t('requests.rejected_title'),
        message: t('requests.rejected_msg').replace('{name}', requestName(req)),
      })
    } catch (e) {
      console.error(e)
      dialog.error({
        kicker: t('ui.error'),
        title: t('requests.reject_failed_title'),
        message: t('requests.reject_failed_msg'),
      })
    } finally {
      setRejecting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader tone="brand" title={t('requests.title')} />

      <div className="flex overflow-hidden rounded-full border border-emerald-200 bg-emerald-50/60 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setStatusTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${statusTab === tab ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-white/60'}`}
          >
            {t(`requests.tab_${tab}`)}
          </button>
        ))}
      </div>

      <motion.div
        className="grid grid-cols-1 gap-4"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      >
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const status = (req.status || '').toLowerCase()
            const isPending = status === 'pending'
            const duration = durationLabel(req)
            return (
              <motion.div key={req.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } } }}>
              <Card className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="flex gap-4">
                  <ProfileLink userId={req.employeeId ?? req.employee_id} name={requestName(req)} className="self-start rounded-full">
                    <Avatar name={requestName(req)} src={getAvatarFor?.(req.employeeId ?? req.employee_id, requestName(req))} size="lg" />
                  </ProfileLink>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-heading text-lg font-bold text-zinc-900">
                        <ProfileLink userId={req.employeeId ?? req.employee_id} name={requestName(req)}>{requestName(req)}</ProfileLink>
                      </h3>
                      <Badge variant={isPending ? 'warning' : req.status === 'approved' ? 'success' : 'danger'}>{t(`requests.status_${status}`, String(req.status || '').toUpperCase())}</Badge>
                    </div>
                    <div className="text-sm text-zinc-500 mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span><strong className="text-zinc-700">{t('requests.type')}:</strong> {leaveTypeLabel(req)}</span>
                      <span className="hidden sm:inline text-zinc-600">•</span>
                      {duration ? (
                        <>
                          <span><strong className="text-zinc-700">{t('requests.duration')}:</strong> {duration}</span>
                          <span className="hidden sm:inline text-zinc-600">•</span>
                        </>
                      ) : null}
                      <span><strong className="text-zinc-700">{t('requests.requested')}:</strong> {formatDateTime ? formatDateTime(req.requestedAt || req.requested_at) : (req.requestedAt || req.requested_at)}</span>
                    </div>
                    {req.reason && <p className="text-sm text-zinc-700 mt-2 bg-zinc-50 p-2 rounded border border-zinc-200/50">{req.reason}</p>}
                    {status === 'rejected' && req.note ? (
                      <p className="text-sm text-rose-900 mt-2 bg-rose-50 p-2 rounded border border-rose-200/60">
                        <span className="font-semibold text-rose-700">{t('requests.rejection_reason')}:</span> {req.note}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                  {isPending && canApprove ? (
                    <>
                      <Button variant="successOutline" size="sm" onClick={() => handleApprove(req)}><CheckCircle className="w-4 h-4" />{t('requests.approve')}</Button>
                      <Button variant="dangerOutline" size="sm" onClick={() => setRejectTarget(req)}><XCircle className="w-4 h-4" />{t('requests.reject')}</Button>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-zinc-400 px-4">{t('requests.processed')}</div>
                  )}
                </div>
              </Card>
              </motion.div>
            )
          })
        ) : (
          <EmptyState title={t(`requests.empty_${statusTab}`)} />
        )}
      </motion.div>

      {rejectTarget ? (
        <ReturnReasonModal
          title={t('requests.reject_confirm_title')}
          description={t('requests.reject_confirm_msg').replace('{name}', requestName(rejectTarget))}
          label={t('requests.reject_reason_label')}
          placeholder={t('requests.reject_reason_placeholder')}
          confirmLabel={t('requests.yes_reject')}
          loading={rejecting}
          onConfirm={(reason) => handleReject(rejectTarget, reason)}
          onCancel={() => setRejectTarget(null)}
        />
      ) : null}
    </div>
  )
}
