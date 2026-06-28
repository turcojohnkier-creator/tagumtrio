export const ROLE_LABELS = {
  gm: 'General Manager',
  hr: 'Human Resource',
  production_incharge: 'Production In-Charge',
  leadman: 'Leadman',
  employee: 'Employee',
  admin: 'Admin',
}

export function formatRole(role) {
  if (!role) return ''
  return ROLE_LABELS[role] || String(role).replace(/_/g, ' ')
}
