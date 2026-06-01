import { useMemo } from 'react'
import { useQr } from '../../context/qr-context'

export default function SalaryManagement() {
  const { employees = [] } = useQr()

  const salaries = useMemo(() => {
    return (employees || []).map((employee, index) => {
      const employeeId = String(employee.employeeId || employee.id || employee.identifier || '')
      const employeeName = employee.employeeName || employee.name || 'Unknown'
      const amount = 14000 + ((Number(employee.employeeId) || 0) % 5) * 1100
      const status = index % 3 === 0 ? 'Released' : index % 3 === 1 ? 'Pending' : 'In Review'
      return {
        id: employeeId || `${employeeName}-${index}`,
        employee: employeeName,
        employeeId,
        amount,
        status,
      }
    })
  }, [employees])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Salary Management</h1>
      {salaries.length === 0 ? (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-slate-400">No salary records available.</div>
      ) : (
        <table className="min-w-full bg-neutral-800 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-neutral-700">
              <th className="px-4 py-2 text-left">Employee</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((row) => (
              <tr key={row.id} className="border-b border-neutral-700">
                <td className="px-4 py-2">
                  <div className="font-semibold text-white">{row.employee}</div>
                  {row.employeeId ? <div className="text-xs text-slate-400">{row.employeeId}</div> : null}
                </td>
                <td className="px-4 py-2">₱{row.amount.toLocaleString()}</td>
                <td className={`px-4 py-2 font-semibold ${row.status === 'Released' ? 'text-green-400' : 'text-yellow-400'}`}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
