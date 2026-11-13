export function getInitials(name) {
  return (
    String(name || 'U')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U'
  )
}
