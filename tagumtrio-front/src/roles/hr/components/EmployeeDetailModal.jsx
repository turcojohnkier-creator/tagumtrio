import { X, File, Info } from 'lucide-react'
import { motion } from 'framer-motion'
import { DEPARTMENTS } from '../../../constants/departments'
import { formatEmployeeId } from '../../../lib/employeeId'
import Button from '../../../shared/ui/Button'
import Portal from '../../../shared/ui/Portal'

export default function EmployeeDetailModal({ employee, onClose, onToggleActive, actionLoading = false }) {
  if (!employee) return null

  const id = employee.employeeId || employee.id || employee.employee_id || ''
  const name = employee.employeeName || employee.name || employee.employee_name || 'Unknown'
  const dept = employee.department || employee.dept || employee.departmentName || '—'
  const role = employee.role || '—'
  const contact = employee.contact || employee.phone || employee.mobile || '—'
  const isActive = employee.is_active !== false
  const toggleLabel = isActive ? 'Archive account' : 'Reactivate account'

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] overflow-y-auto p-4">
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <div className="relative flex min-h-full items-center justify-center">
        <motion.div
          className="relative w-full max-w-3xl max-h-[85vh] mx-auto overflow-y-auto bg-zinc-50 border border-zinc-200 rounded-lg"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-zinc-200 bg-zinc-50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-2xl text-emerald-700 font-semibold border border-emerald-500/20">{name.split(' ').map(n=>n[0]).join('').substring(0,2)}</div>
              <div>
                <h3 className="font-heading text-lg font-bold text-zinc-900">{name}</h3>
                <p className="text-xs text-zinc-500">{formatEmployeeId(id)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-900"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Personal Details</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-zinc-500">Full name</p>
                    <p className="text-sm font-medium text-zinc-900">{name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Employee ID</p>
                    <p className="text-sm font-medium text-zinc-900">{formatEmployeeId(id)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Department</p>
                    <p className="text-sm font-medium text-zinc-900">{dept}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Role</p>
                    <p className="text-sm font-medium text-zinc-900">{role}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-zinc-500">Contact</p>
                    <p className="text-sm font-medium text-zinc-900">{contact}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Work History (recent)</p>
                <div className="mt-3 text-sm text-zinc-500">This section displays recent work/production history. (UI placeholder)</div>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Info className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm text-zinc-900 font-medium">2026-05-28 • Output recorded</div>
                        <div className="text-xs text-zinc-500">Department: {DEPARTMENTS[0] || 'Rotary'} • Qty: 12</div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">View</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Supporting Documents</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <File className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm text-zinc-900 font-medium">Government ID (front)</div>
                        <div className="text-xs text-zinc-500">uploaded: 2025-08-12</div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">Preview</div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <File className="w-4 h-4 text-zinc-500" />
                      <div>
                        <div className="text-sm text-zinc-900 font-medium">Signed Contract (v1)</div>
                        <div className="text-xs text-zinc-500">uploaded: 2024-11-02</div>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500">Preview</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center">
                <p className="text-sm text-zinc-500">Actions</p>
                <div className="mt-3 space-y-2">
                  <Button onClick={() => onToggleActive && onToggleActive(employee)} disabled={actionLoading} className="w-full">
                    {actionLoading ? 'Updating...' : toggleLabel}
                  </Button>
                  <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    </Portal>
  )
}
