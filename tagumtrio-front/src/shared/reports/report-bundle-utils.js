export function groupReportsIntoBundles(reports = []) {
  const groups = new Map()

  ;(Array.isArray(reports) ? reports : []).forEach((report) => {
    const department = report.department || 'Unknown Department'
    const reportDate = report.reportDate || report.report_date || ''
    const key = `${department}::${reportDate}`
    if (!groups.has(key)) {
      groups.set(key, { key, department, reportDate, reports: [] })
    }
    groups.get(key).reports.push(report)
  })

  return Array.from(groups.values())
    .map((bundle) => {
      const employeeIds = new Set()
      let totalAmount = 0
      const statuses = new Set()

      bundle.reports.forEach((report) => {
        const entries = Array.isArray(report.entries) ? report.entries : []
        entries.forEach((entry) => {
          const id = entry.employeeId ?? entry.employeeName
          if (id !== undefined && id !== null && id !== '') employeeIds.add(String(id))
          totalAmount += Number(entry.amount || 0)
        })
        statuses.add(String(report.status || '').toLowerCase())
      })

      const latestReport = bundle.reports.reduce((latest, report) => {
        const current = new Date(report.createdAt || report.created_at || 0)
        const best = new Date(latest?.createdAt || latest?.created_at || 0)
        return current > best ? report : latest
      }, bundle.reports[0])

      return {
        ...bundle,
        reportCount: bundle.reports.length,
        employeeCount: employeeIds.size,
        totalAmount,
        status: statuses.size === 1 ? [...statuses][0] : 'mixed',
        latestDate: latestReport?.createdAt || latestReport?.created_at || bundle.reportDate,
      }
    })
    .sort((a, b) => new Date(b.latestDate || 0) - new Date(a.latestDate || 0))
}
