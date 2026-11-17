// Printed payslip — mirrors the company's paper (Excel) payslip.

export const COMPANY = {
  name: 'TAGUM TRIO LUMBER CORPORATION',
  address: 'Purok Nagkaisa, Brgy La Paz, Carmen Davao Del Norte',
  contact: 'CONTACT NUMBER: (0966) 612 1275',
}

// Printed at the bottom of every payslip.
export const PAYSLIP_SIGNATORY = {
  name: 'Rhejane J. Austral',
  title: 'Admin Staff',
}

// Pay weeks run Thursday through Wednesday (0 = Sunday … 6 = Saturday).
export const PAY_WEEK_START_DAY = 4

// Earning lines after PAKYAWAN. `key` names the payslip field that supplies
// the amount; null means the system doesn't track it yet, so it prints "-".
// Wire a key up here (and in buildPayslip) to start filling a line.
export const EARNING_ROWS = [
  { label: 'NO. OF OT HRS', key: null },
  { label: 'OVERTIME', key: null },
  { label: 'SUNDAY DUTY PAY', key: null },
  { label: 'REGULAR HOLIDAY', key: null },
  { label: 'REGULAR HOLIDAY OT', key: null },
  { label: 'REGULAR HOLIDAY OT AMOUNT', key: null, small: true },
  { label: 'SPECIAL HOLIDAY', key: null },
  { label: 'NIGHT DIFFERENTIAL', key: null },
  { label: 'SICK/INCENTIVE/ADJ', key: null },
  { label: 'HALF DAY/UNDERTIME', key: null },
  { label: 'DISCREPANCY', key: null },
]

// Deductions are not tracked yet (per adviser) — all print "-".
export const DEDUCTION_ROWS = [
  { label: 'SSS', key: null },
  { label: 'PHIC', key: null },
  { label: 'PAG-IBIG', key: null },
  { label: 'CASH ADVANCE', key: null },
  { label: 'OTHER DEDUCTION', key: null },
  { label: 'SSS LOAN', key: null },
  { label: 'PAG-IBIG LOAN', key: null },
]
