import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { updateEmployeeApi } from '../../lib/api'
import { DEPARTMENTS } from '../../constants/departments'

export default function EmployeeListModal({ department, onClose, employees = [] }) {
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
      return window.alert('Select a department to reassign this employee.')
    }

    try {
      setReassigningId(empId)
      await updateEmployeeApi(empId, { department: targetDept })
      setLocalEmployees((cur) => cur.filter((e) => String(e.id) !== String(empId)))
      setReassigningId(null)
      window.alert('Employee reassigned successfully.')
    } catch (err) {
      console.error(err)
      setReassigningId(null)
      window.alert('Failed to reassign employee. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl xl:max-w-6xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl shadow-black/50 max-h-[90vh]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-800 bg-slate-900 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Department team</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{department.name}</h2>
            <p className="mt-1 text-sm text-slate-400">Open the employee roster and reassign workers with one click.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-slate-300">
              Active: <span className="font-semibold text-white">{localEmployees.length}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Reassign employees</p>
                <p className="mt-1 text-sm text-slate-400">Select a department and reassign employees directly from the roster.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 sm:items-center">
                <label className="text-sm font-medium text-slate-300">Target department</label>
                <select
                  className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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

          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-800 bg-slate-900 shadow-sm">
            <div className="grid grid-cols-[minmax(220px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_180px] gap-0 border-b border-slate-800 bg-slate-950 px-5 py-3 text-xs uppercase tracking-[0.24em] text-slate-500">
              <span>Employee</span>
              <span>ID</span>
              <span>Role</span>
              <span className="text-right">Action</span>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {localEmployees.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">No active employees assigned to this department.</div>
              ) : (
                localEmployees.map((emp) => {
                  const employeeKey = emp.employeeId ?? emp.id
                  return (
                    <div key={employeeKey} className="grid grid-cols-[minmax(220px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_180px] gap-0 border-b border-slate-800 px-5 py-4 text-sm text-slate-200 hover:bg-slate-950/70">
                      <div>
                        <div className="font-semibold text-white">{emp.employeeName || emp.name || emp.fullName || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{emp.department || 'Unassigned'}</div>
                      </div>
                      <div className="text-slate-400">{employeeKey}</div>
                      <div className="text-slate-400">{emp.role || 'Employee'}</div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:text-white"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          disabled={!targetDept || reassigningId === employeeKey}
                          onClick={() => reassign(employeeKey)}
                          className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {reassigningId === employeeKey ? 'Saving...' : 'Reassign'}
                        </button>
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
  )
}
