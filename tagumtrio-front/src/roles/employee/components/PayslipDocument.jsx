import { COMPANY, PAYSLIP_SIGNATORY } from '../../../constants/payslip'
import { formatSlipDay } from '../../../lib/datetime'
import { formatEmployeeId } from '../../../lib/employeeId'
import { buildPayslip, formatPayAmount, formatPayslipName } from '../../../lib/payslip'

// Colours sampled from the company's paper payslip.
const RED = '#d0021b'
const PEACH = '#fde9e1'

// A day with no pay prints "-", like the paper slip.
function display(value) {
  return Number(value || 0) === 0 ? '-' : formatPayAmount(value)
}

function Row({ label, value, shaded = false, bold = false, red = false, labelColor, total = false }) {
  return (
    <div
      className="grid items-end px-1.5"
      style={{
        gridTemplateColumns: '52% 6% 42%',
        background: shaded ? PEACH : undefined,
        fontWeight: bold ? 700 : 400,
        color: red ? RED : undefined,
        lineHeight: 1.35,
      }}
    >
      <span
        className="truncate"
        style={{ color: labelColor }}
      >
        {label}
      </span>
      <span className="text-center">:</span>
      <span
        className="text-right tabular-nums"
        style={total ? { borderBottom: `3px double ${RED}` } : undefined}
      >
        {value}
      </span>
    </div>
  )
}

/**
 * Printable payslip — a replica of the company's paper (Excel) payslip.
 * `employee`: { id, name, department }   `week`: one entry from groupPayslipWeeks()
 */
export default function PayslipDocument({ employee, week }) {
  const slip = buildPayslip(week)

  return (
    <div
      className="payslip-document bg-white text-black"
      style={{
        width: '95mm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10.5px',
        border: '1px solid #000',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      {/* Company header */}
      <div className="px-1 pt-1 text-center" style={{ lineHeight: 1.25 }}>
        <p style={{ color: RED, fontWeight: 700, fontSize: '13px', letterSpacing: '0.2px' }}>{COMPANY.name}</p>
        <p style={{ fontWeight: 700, fontSize: '9.5px' }}>{COMPANY.address}</p>
        <p style={{ fontWeight: 700, fontSize: '10px' }}>{COMPANY.contact}</p>
      </div>

      <div className="mt-1 text-center" style={{ background: '#000', color: '#fff', fontWeight: 700, fontSize: '11px', padding: '2px 0' }}>
        PAY SLIP
      </div>

      {/* Employee block */}
      <div className="px-2 py-1.5" style={{ lineHeight: 1.4 }}>
        <p>
          <span style={{ fontWeight: 700 }}>EMP #:</span>
          <span className="ml-6">{formatEmployeeId(employee?.id) || '-'}</span>
        </p>
        <p className="flex items-baseline gap-3">
          <span style={{ fontWeight: 700, fontSize: '12px' }}>Name:</span>
          <span style={{ color: RED, fontWeight: 700, fontSize: '12px' }}>{formatPayslipName(employee?.name) || '-'}</span>
        </p>
        <p className="flex items-baseline gap-2">
          <span style={{ fontWeight: 700, fontSize: '9px' }}>DESIGNATION</span>
          <span style={{ color: RED, fontWeight: 700 }}>{employee?.department || '-'}</span>
        </p>
      </div>

      <div className="text-center" style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '1px 0', fontSize: '10.5px' }}>
        FOR THE PERIOD OF {slip.period}
      </div>

      {/* Each day of the pay week and what was earned, then the week's total.
          Only lines the system actually computes are printed. */}
      <div className="pt-1 pb-1">
        {slip.days.map((day) => (
          <Row
            key={day.key}
            label={formatSlipDay(day.key)}
            labelColor={day.isSunday ? RED : undefined}
            value={display(day.amount)}
          />
        ))}
        <div className="pt-1">
          <Row label="TOTAL" value={formatPayAmount(slip.total)} shaded bold red total />
        </div>
      </div>

      {/* Signatory */}
      <div className="px-2 pb-2 pt-4" style={{ lineHeight: 1.3 }}>
        <p style={{ fontWeight: 700, fontSize: '11px' }}>{PAYSLIP_SIGNATORY.name}</p>
        <p style={{ fontWeight: 700, fontSize: '11px' }}>{PAYSLIP_SIGNATORY.title}</p>
      </div>
    </div>
  )
}
