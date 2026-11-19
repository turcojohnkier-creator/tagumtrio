import { useCallback, useEffect, useState } from 'react'
import { fetchReportHistoryApi } from '../../../lib/api'
import { groupPayslipWeeks } from '../../../lib/payslip'
import useLiveRefresh from '../../../shared/hooks/useLiveRefresh'

/**
 * The signed-in employee's pay weeks (Thursday–Wednesday), newest first, built
 * from their GM-approved report entries. The history endpoint returns only the
 * employee's own rows, so coworkers' pay never reaches the browser.
 *
 * Reloads by itself when the GM releases new pay (payslip_released).
 */
export default function usePayslipWeeks(employeeId) {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (employeeId == null) return
    try {
      const reports = await fetchReportHistoryApi({ limit: 500 })
      setWeeks(groupPayslipWeeks(reports, employeeId))
      setError('')
    } catch (err) {
      setError(err?.message || 'Unable to load your payslips.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (employeeId == null) return undefined
    let cancelled = false
    fetchReportHistoryApi({ limit: 500 })
      .then((reports) => { if (!cancelled) setWeeks(groupPayslipWeeks(reports, employeeId)) })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Unable to load your payslips.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId])

  useLiveRefresh(load, { types: ['payslip_released'], intervalMs: 60000, enabled: employeeId != null })

  return { weeks, loading, error }
}
