import { X, File, Info } from 'lucide-react'
import { DEPARTMENTS } from '../../constants/departments'

export default function EmployeeDetailModal({ employee, onClose }) {
  if (!employee) return null

  const id = employee.employeeId || employee.id || employee.employee_id || ''
  const name = employee.employeeName || employee.name || employee.employee_name || 'Unknown'
  const dept = employee.department || employee.dept || employee.departmentName || '—'
  const role = employee.role || '—'
  const contact = employee.contact || employee.phone || employee.mobile || '—'
  const email = employee.email || employee.employeeEmail || '—'

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl text-emerald-400 font-bold border border-emerald-500/20">{name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
            <div>
              <h3 className="text-lg font-semibold text-white">{name}</h3>
              <p className="text-xs text-slate-400">{id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Personal Details</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-slate-400">Full name</p>
                  <p className="text-sm font-medium text-white">{name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Employee ID</p>
                  <p className="text-sm font-medium text-white">{id}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Department</p>
                  <p className="text-sm font-medium text-white">{dept}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Role</p>
                  <p className="text-sm font-medium text-white">{role}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Contact</p>
                  <p className="text-sm font-medium text-white">{contact}</p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400">Email</p>
                  <p className="text-sm font-medium text-white">{email}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Work History (recent)</p>
              <div className="mt-3 text-sm text-slate-400">This section displays recent work/production history. (UI placeholder)</div>
              <div className="mt-3 grid gap-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-slate-400" />
                    <div>
                          <div className="text-sm text-white font-medium">2026-05-28 • Output recorded</div>
                            <div className="text-xs text-slate-400">Department: {DEPARTMENTS[0] || 'Rotary'} • Qty: 12</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">View</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500">Supporting Documents</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <File className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-white font-medium">Government ID (front)</div>
                      <div className="text-xs text-slate-400">uploaded: 2025-08-12</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">Preview</div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <File className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm text-white font-medium">Signed Contract (v1)</div>
                      <div className="text-xs text-slate-400">uploaded: 2024-11-02</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">Preview</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-sm text-slate-400">Actions</p>
              <div className="mt-3 flex flex-col gap-2">
                <button className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-medium">Open Edit (UI only)</button>
                <button className="px-4 py-2 rounded-lg border border-slate-800 text-slate-300">Download Profile</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
