export function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase()
}

// Entries in report.returnHistory: {byRole, byId, byName, reason, at}, oldest first.
export function getReturnHistory(report) {
  return Array.isArray(report?.returnHistory) ? report.returnHistory : []
}

export function getLatestReturn(report) {
  const history = getReturnHistory(report)
  return history.length ? history[history.length - 1] : null
}

export function returnLabel(entry, t) {
  if (entry?.byRole === 'gm') return t('report.return.by_gm', 'Returned by GM')
  if (entry?.byRole === 'production_incharge') return t('report.return.by_production_incharge', 'Returned by Production In-Charge')
  return t('report.return.by_unknown', 'Returned')
}

// Unique names of the leadmen who submitted these reports, e.g. for a bundle card.
export function getSubmitterNames(reports = []) {
  return Array.from(new Set(
    reports.map((report) => String(report?.submittedByName || '').trim()).filter(Boolean)
  ))
}

export function getStatusLabel(status) {
  switch (normalizeStatus(status)) {
    case 'submitted':
      return 'Awaiting leadman verification'
    case 'leadman_verified':
      return 'Leadman verified'
    case 'compiled':
      return 'Compiled'
    case 'gm_submitted':
      return 'Pending GM approval'
    case 'approved':
      return 'Approved — payroll released'
    case 'rejected':
      return 'Rejected'
    case 'gm_returned':
      return 'Returned by GM'
    case 'returned':
      return 'Returned by Production In-Charge'
    case 'mixed':
      return 'Mixed statuses'
    default:
      return status || 'Unknown'
  }
}

export function getStatusVariant(status) {
  switch (normalizeStatus(status)) {
    case 'submitted':
      return 'warning'
    case 'leadman_verified':
    case 'compiled':
    case 'approved':
      return 'success'
    case 'gm_submitted':
      return 'info'
    case 'rejected':
    case 'gm_returned':
    case 'returned':
      return 'danger'
    default:
      return 'neutral'
  }
}
