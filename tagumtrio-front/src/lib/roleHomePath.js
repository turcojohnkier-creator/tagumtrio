export function roleHomePath(role) {
  if (role === 'leadman') return '/app/leadman'
  if (role === 'gm') return '/app/gm'
  if (role === 'hr') return '/app/hr/employees'
  return '/app/portal'
}
