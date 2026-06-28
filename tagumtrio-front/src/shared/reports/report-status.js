export function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase()
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
      return 'danger'
    default:
      return 'neutral'
  }
}
