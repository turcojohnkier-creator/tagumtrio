const MANILA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// "Today" for payroll/salary purposes resets at midnight Philippine time,
// not UTC midnight (which would be 8am PHT) — always compute date keys
// through this so "today" lines up with the business's actual day boundary.
export function toManilaDateKey(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return null
  return MANILA_DATE_FORMATTER.format(date)
}
