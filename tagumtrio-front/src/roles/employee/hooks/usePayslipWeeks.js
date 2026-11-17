import { useEffect, useState } from 'react'
import { fetchReportHistoryApi } from '../../../lib/api'
import { groupPayslipWeeks } from '../../../lib/payslip'

/**
 * The signed-in employee's pay weeks (Thursday–Wednesday), newest first, built
 * from their GM-approved report entries. The history endpoint returns only the
 * employee's own rows, so coworkers' pay never reaches the browser.
 */
export default function usePayslipWeeks(employeeId) {
  const [weeks, setWeeks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (employeeId == null) return undefined
    let cancelled = false
    fetchReportHistoryApi({ limit: 500 })
      .then((reports) => { if (!cancelled) setWeeks(groupPayslipWeeks(reports, employeeId)) })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Unable to load your payslips.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId])

  return { weeks, loading, error }
}
