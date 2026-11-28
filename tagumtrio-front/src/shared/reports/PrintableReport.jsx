import { formatProductWithUnit } from '../../lib/units'
import { formatPeso, groupBatches, summarizeBatches } from './report-entry-utils'
import logo from '../../assets/tagumtrio-logo.jpg'

function formatReportDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

// Paper version of a report. Only visible while printing (see the .print-area
// rule in index.css). The main table has the same columns and totals as the
// on-screen DailyReportTable. Paper can't open popups, so the employees and
// photos behind the Employees / Photos buttons are printed below it.
export default function PrintableReport({ report }) {
  if (!report) return null

  const batches = groupBatches(report.entries, report.department, report.reportDate)
  const totals = summarizeBatches(batches)
  const th = 'py-1.5 pr-2'

  return (
    <div className="hidden print:block print-area text-zinc-900">
      <div className="flex items-center gap-3 border-b border-zinc-300 pb-4">
        <img src={logo} alt="Tagum Trio Lumber Corporation" className="h-12 w-12 rounded-lg object-cover" />
        <div>
          <p className="text-lg font-bold">Tagum Trio Lumber Corporation</p>
          <p className="text-sm text-zinc-600">Daily Production Report</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <p><strong>Department:</strong> {report.department || '-'}</p>
        <p><strong>Submitted:</strong> {formatReportDate(report.createdAt || report.reportDate)}</p>
        <p><strong>Submitted by:</strong> {report.submittedByName || '-'}</p>
        <p><strong>Printed on:</strong> {formatReportDate(new Date())}</p>
      </div>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-zinc-400 text-left">
            <th className={th}>Department</th>
            <th className={th}>Product</th>
            <th className={th}>Quantity</th>
            <th className={th}>Date</th>
            <th className={th}>Employees</th>
            <th className={th}>Photos</th>
            <th className={`${th} text-right`}>Rate per head</th>
            <th className={`${th} text-right`}>Total amount</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.key} className="border-b border-zinc-200">
              <td className={th}>{batch.department || '-'}</td>
              <td className={th}>{batch.product ? formatProductWithUnit(batch.product, batch.department) : '-'}</td>
              <td className={th}>{batch.quantity ? batch.quantity.toLocaleString() : '-'}</td>
              <td className={th}>{batch.date || '-'}</td>
              <td className={th}>{batch.workers.length}</td>
              <td className={th}>{batch.photos.length}</td>
              <td className={`${th} text-right`}>{formatPeso(batch.ratePerHead)}</td>
              <td className={`${th} text-right`}>{formatPeso(batch.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-zinc-400 font-semibold">
            <td className={th} colSpan={2}>Total ({totals.batchCount} batch{totals.batchCount === 1 ? '' : 'es'})</td>
            <td className={th}>{totals.totalQuantity.toLocaleString()}</td>
            <td className={th} />
            <td className={th}>{totals.workerCount} worker{totals.workerCount === 1 ? '' : 's'}</td>
            <td className={th}>{totals.photos.length} photo{totals.photos.length === 1 ? '' : 's'}</td>
            <td className={th} />
            <td className={`${th} text-right`}>{formatPeso(totals.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      {batches.map((batch) => (
        <div key={`workers-${batch.key}`} className="mt-4">
          <p className="text-sm font-semibold">
            Employees included{batches.length > 1 ? ` · ${batch.product ? formatProductWithUnit(batch.product, batch.department) : batch.department}` : ''} ({batch.workers.length})
          </p>
          <table className="mt-1 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-400 text-left">
                <th className={th}>Employee ID</th>
                <th className={th}>Employee Name</th>
                <th className={`${th} text-right`}>Rate per head</th>
              </tr>
            </thead>
            <tbody>
              {batch.workers.map((worker, index) => (
                <tr key={`${worker.id ?? worker.name}-${index}`} className="border-b border-zinc-200">
                  <td className={th}>{worker.identifier || '-'}</td>
                  <td className={th}>{worker.name || '-'}</td>
                  <td className={`${th} text-right`}>{formatPeso(batch.ratePerHead)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {totals.photos.length > 0 ? (
        <div className="mt-4">
          <p className="text-sm font-semibold">Photos attached ({totals.photos.length})</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {totals.photos.map((photo, index) => (
              <figure key={`${photo.label}-${index}`}>
                <img src={photo.src} alt={photo.label || `Evidence ${index + 1}`} className="h-24 w-full rounded border border-zinc-300 object-cover" />
                {photo.label ? <figcaption className="mt-0.5 text-xs text-zinc-600">{photo.label}</figcaption> : null}
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
