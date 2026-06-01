import { useMemo } from 'react'
import { useQr } from '../../context/qr-context'

export default function Workforce() {
  const { employees = [] } = useQr()

  const workforce = useMemo(() => {
    return (employees || []).map((employee) => {
      const employeeId = String(employee.employeeId || employee.id || employee.identifier || '')
      const name = employee.employeeName || employee.name || 'Unknown'
      const department = employee.department || 'Unassigned'
      const status = employee.status || (employee.isActive === false ? 'Inactive' : 'Active')
      return {
        id: employeeId || name,
        name,
        department,
        status,
      }
    })
  }, [employees])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Workforce</h1>
      {workforce.length === 0 ? (
        <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-slate-400">No workforce records available.</div>
      ) : (
        <table className="min-w-full bg-neutral-800 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-neutral-700">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Department</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {workforce.map((row) => (
              <tr key={row.id} className="border-b border-neutral-700">
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.department}</td>
                <td className={`px-4 py-2 font-semibold ${row.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
