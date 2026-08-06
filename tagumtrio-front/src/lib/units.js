// There's no structured "unit" field anywhere for products — Rate Management's
// product/size is a single free-text string the GM types (e.g. "Sizer16cm/18cm"
// vs. a plain piece-count product like "Sack"). We infer whether a product is a
// physical measurement by checking for a digit in its name, and if so, treat
// its Quantity as a length in centimeters wherever it's entered or displayed.
export function isMeasuredProduct(product) {
  return /\d/.test(String(product || ''))
}

export function formatQuantityWithUnit(quantity, product) {
  if (quantity === '' || quantity === null || quantity === undefined) return quantity
  return isMeasuredProduct(product) ? `${quantity} cm` : String(quantity)
}
