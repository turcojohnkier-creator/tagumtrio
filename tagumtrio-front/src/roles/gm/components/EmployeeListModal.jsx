import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useDialog } from '../../../context/dialog-context'
import { updateEmployeeApi } from '../../../lib/api'
import { DEPARTMENTS } from '../../../constants/departments'
import Button from '../../../shared/ui/Button'
import EmptyState from '../../../shared/ui/EmptyState'
import Portal from '../../../shared/ui/Portal'

export default function EmployeeListModal({ department, onClose, employees = [], onReassigned }) {
  const dialog = useDialog()
  const [localEmployees, setLocalEmployees] = useState([])
  const [targetDept, setTargetDept] = useState('')
  const [reassigningId, setReassigningId] = useState(null)

  useEffect(() => {
    setLocalEmployees((employees || []).filter((e) => (e.department || 'Unassigned') === department.name))
    setTargetDept('')
  }, [department, employees])

  const availableDepartments = useMemo(
    () => DEPARTMENTS.filter((name) => name !== department.name),
    [department.name]
  )

  async function reassign(empId) {
    if (!targetDept) {
      dialog.error({
        title: 'Select target department',
        message: 'Please select a department before reassigning this employee.',
      })
      return
    }

    const employee = localEmployees.find((e) => String(e.employeeId) === String(empId) || String(e.id) === String(empId))
    const oldDepartment = employee?.department || employee?.dept || 'Unassigned'

    try {
      setReassigningId(empId)
      await updateEmployeeApi(empId, { department: targetDept })
      setLocalEmployees((cur) => cur.filter((e) => String(e.id) !== String(empId) && String(e.employeeId) !== String(empId)))
      setReassigningId(null)
      onReassigned?.({
        employeeId: employee?.employeeId || empId,
        employeeName: employee?.employeeName || employee?.name || employee?.fullName || `Employee ${empId}`,
        oldDepartment,
        targetDepartment: targetDept,
        createdAt: new Date().toISOString(),
        source: 'gm',
      })
      dialog.success({
        title: 'Employee reassigned',
        message: `${employee?.employeeName || `Employee ${empId}`} was reassigned from ${oldDepartment} to ${targetDept}.`,
      })
    } catch (err) {
      console.error(err)
      setReassigningId(null)
      dialog.error({
        title: 'Reassignment failed',
        message: err?.message || 'Unable to reassign employee. Please try again.',
      })
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-50 shadow-sm max-h-[90vh]">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Department team</p>
            <h2 className="mt-2 font-heading text-2xl font-bold text-zinc-900">{department.name}</h2>
            <p className="mt-1 text-sm text-zinc-500">Open the employee roster and reassign workers with one click.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white px-4 py-2 text-sm text-zinc-700">
              Active: <span className="font-semibold text-zinc-900">{localEmployees.length}</span>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onClose}>
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-wide text-zinc-400">Reassign employees</p>
                <p className="mt-1 text-sm text-zinc-500">Select a department and reassign employees directly from the roster.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
                <label className="text-sm font-medium text-zinc-700">Target department</label>
                <select
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  value={targetDept}
                  onChange={(e) => setTargetDept(e.target.value)}
                >
                  <option value="">Select department</option>
                  {availableDepartments.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(220px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_180px] gap-0 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs uppercase tracking-wide text-zinc-400">
              <span>Employee</span>
              <span>ID</span>
              <span>Role</span>
              <span className="text-right">Action</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {localEmployees.length === 0 ? (
                <div className="p-8">
                  <EmptyState title="No employees" description="No active employees assigned to this department." />
                </div>
              ) : (
                localEmployees.map((emp) => {
                  const employeeKey = emp.employeeId ?? emp.id
                  return (
                    <div key={employeeKey} className="grid grid-cols-[minmax(220px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_180px] gap-0 border-b border-zinc-200 px-5 py-4 text-sm text-zinc-800 hover:bg-zinc-50/70">
                      <div>
                        <div className="font-semibold text-zinc-900">{emp.employeeName || emp.name || emp.fullName || 'Unknown'}</div>
                        <div className="text-xs text-zinc-400">{emp.department || 'Unassigned'}</div>
                      </div>
                      <div className="text-zinc-500">{employeeKey}</div>
                      <div className="text-zinc-500">{emp.role || 'Employee'}</div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" className="rounded-full">
                          View
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full"
                          disabled={!targetDept || reassigningId === employeeKey}
                          onClick={() => reassign(employeeKey)}
                        >
                          {reassigningId === employeeKey ? 'Saving...' : 'Reassign'}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  )
}
