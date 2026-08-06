// There's no structured "unit" field anywhere for products — Rate Management's
// product/size is a single free-text string the GM types. Only Rotary's and
// Sundry's products are bare size numbers (e.g. "2.4") that mean a physical
// measurement in centimeters — every other department's numeric-looking
// product codes (e.g. Assembly's "8.5"/"10") are piece-price categories,
// where quantity is a piece count (e.g. 300 pieces made), not a size. So the
// cm suffix is scoped to the department, not just "does the name contain a digit".
const CM_SIZED_DEPARTMENTS = new Set(['Rotary', 'Sundry'])

export function needsCmSuffix(product, department) {
  if (!CM_SIZED_DEPARTMENTS.has(String(department || '').trim())) return false
  const str = String(product || '')
  if (!/\d/.test(str)) return false
  if (/mm|cm/i.test(str)) return false
  return true
}

export function formatProductWithUnit(product, department) {
  const str = String(product || '')
  if (!needsCmSuffix(str, department)) return str
  // Insert "cm" right after the number itself, not appended to the end of the
  // whole string — e.g. "3.8 Far" -> "3.8cm Far", not "3.8 Farcm".
  return str.replace(/(\d+(\.\d+)?)(?!.*\d)/, '$1cm')
}
