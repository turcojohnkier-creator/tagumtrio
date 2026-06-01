import { useEffect, useMemo, useState } from 'react'
import { useQr } from '../../context/qr-context'
import { Factory, PauseCircle, Users, AlertCircle, RefreshCw } from 'lucide-react'
import { DEPARTMENTS } from '../../constants/departments'

const INITIAL_SECTIONS = [
  { id: 'rotary', name: DEPARTMENTS[0] || 'Rotary', status: 'Running', throughput: 120, activeWorkers: 8 },
  { id: 'sorting', name: DEPARTMENTS[1] || 'Sorting', status: 'Running', throughput: 72, activeWorkers: 5 },
  { id: 'hotpress', name: DEPARTMENTS[2] || 'Hotpress', status: 'Issue', throughput: 20, activeWorkers: 4 },
]

export default function ProductionOversight() {
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const { productionRecords, employees = [] } = useQr()
  const [selected, setSelected] = useState(null)
  const [tick, setTick] = useState(0)
  const [confirm, setConfirm] = useState(null)

  const employeeMap = useMemo(() => {
    const map = new Map()
    (employees || []).forEach((employee) => {
      const key = String(employee.employeeId || employee.id || '').trim()
      if (key) map.set(key, employee)
    })
    return map
  }, [employees])

  const enrichedProductionRecords = useMemo(() => {
    return (Array.isArray(productionRecords) ? productionRecords : []).map((rec) => {
      const employeeId = String(rec.employeeId || rec.operatorId || '').trim()
      const employee = employeeMap.get(employeeId)
      const employeeName = rec.employeeName || employee?.employeeName || rec.operator || 'Unknown'
      const department = rec.department || employee?.department || rec.section || rec.dept || 'Unknown'
      return {
        ...rec,
        employeeId,
        employeeName,
        department,
      }
    })
  }, [productionRecords, employeeMap])

  // Seed sections from productionRecords when available
  useEffect(() => {
    if (!Array.isArray(enrichedProductionRecords) || enrichedProductionRecords.length === 0) return
    const map = new Map()
    for (const rec of enrichedProductionRecords) {
      const dept = rec.department || 'Unknown'
      const key = String(dept).trim()
      if (!map.has(key)) map.set(key, { id: key.toLowerCase().replace(/\s+/g, '_'), name: key, throughput: 0, activeWorkersSet: new Set(), status: 'Running' })
      const entry = map.get(key)
      // throughput: try amount then loggedHours then count
      const amount = Number(rec.amount || rec.total || 0)
      const hours = Number(rec.loggedHours || 0)
      entry.throughput += amount > 0 ? amount : (hours > 0 ? hours : 1)
      const empKey = String(rec.employeeId || rec.employeeName || '').trim()
      if (empKey) entry.activeWorkersSet.add(empKey)
      if (String(rec.status || '').toLowerCase().includes('issue')) entry.status = 'Issue'
    }

    const computed = Array.from(map.values()).map((v) => ({ id: v.id, name: v.name, throughput: v.throughput, activeWorkers: v.activeWorkersSet.size, status: v.status }))
    if (computed.length > 0) setSections(computed)
  }, [enrichedProductionRecords])

  // mock realtime updater: change throughput and occasionally toggle status
  useEffect(() => {
    const id = setInterval(() => {
      setSections((prev) => prev.map((s) => {
        const delta = Math.floor(Math.random() * 7) - 3
        let throughput = Math.max(0, s.throughput + delta)
        let status = s.status
        if (Math.random() < 0.05) status = status === 'Running' ? 'Issue' : 'Running'
        if (throughput === 0) status = 'Paused'
        return { ...s, throughput, status }
      }))
      setTick((t) => t + 1)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  const summary = useMemo(() => {
    const totalThroughput = sections.reduce((s, x) => s + x.throughput, 0)
    const totalWorkers = sections.reduce((s, x) => s + x.activeWorkers, 0)
    const issues = sections.filter(s => s.status === 'Issue').length
    return { totalThroughput, totalWorkers, issues }
  }, [sections])

  function applyAction(action, section) {
    if (action === 'pause') {
      setSections((prev) => prev.map(s => s.id === section.id ? { ...s, status: 'Paused' } : s))
    }
    if (action === 'reassign') {
      setSections((prev) => prev.map(s => s.id === section.id ? { ...s, activeWorkers: Math.max(0, s.activeWorkers - 1) } : s))
    }
    if (action === 'escalate') {
      setSections((prev) => prev.map(s => s.id === section.id ? { ...s, status: 'Issue' } : s))
    }
    // record audit in local mock (append to productionRecords not allowed here), so we keep audit display from `productionRecords` which is read-only from provider
  }

  function handleActionRequest(action, section) {
    setConfirm({ action, section })
  }

  function confirmAction(yes) {
    if (yes && confirm) applyAction(confirm.action, confirm.section)
    setConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Production In‑Charge — Oversight</h2>
        <p className="text-slate-400 mt-1">Monitor real-time progress and manage production sections.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Total Throughput</p>
          <p className="text-2xl font-semibold text-white">{summary.totalThroughput}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Active Workers</p>
          <p className="text-2xl font-semibold text-white">{summary.totalWorkers}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs text-slate-400">Sections with Issues</p>
          <p className="text-2xl font-semibold text-white">{summary.issues}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-400">Live Sections</p>
          <div className="text-xs text-slate-400 flex items-center gap-2"><RefreshCw className="w-4 h-4" />Updated {tick}s</div>
        </div>

        <div className="space-y-3">
          {sections.map((sec) => (
            <div key={sec.id} className="flex items-center justify-between rounded-lg bg-slate-950 border border-slate-800 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Factory className="w-5 h-5" /></div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{sec.name}</div>
                  <div className="text-xs text-slate-400">Throughput: {sec.throughput} • Workers: {sec.activeWorkers}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`rounded-full px-3 py-1 text-xs ${sec.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : sec.status === 'Paused' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {sec.status}
                </div>
                <button onClick={() => handleActionRequest('pause', sec)} className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm">Pause Section</button>
                <button onClick={() => handleActionRequest('reassign', sec)} className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-sm">Reassign Worker</button>
                <button onClick={() => { setSelected(sec) }} className="px-3 py-1 rounded-lg bg-emerald-500 text-black text-sm">Details</button>
                <button onClick={() => handleActionRequest('escalate', sec)} className="px-3 py-1 rounded-lg bg-rose-500 text-black text-sm">Escalate</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400"><Factory className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{selected.name}</h3>
                  <p className="text-xs text-slate-400">Status: {selected.status} • Workers: {selected.activeWorkers}</p>
                </div>
              </div>
              <div className="text-xs text-slate-400">Drilldown</div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Recent Events</p>
                <div className="mt-3 space-y-2 text-sm text-slate-400">
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">2026-05-28 09:12 — Output recorded: 12 units</div>
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">2026-05-28 08:55 — Worker reassigned: E021 → {DEPARTMENTS[0] || 'Rotary'}</div>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400">Actions</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button onClick={() => handleAction('pause', selected)} className="px-4 py-2 rounded-lg bg-yellow-500 text-black">Pause Section</button>
                  <button onClick={() => handleAction('reassign', selected)} className="px-4 py-2 rounded-lg bg-emerald-500 text-black">Reassign Worker</button>
                  <button onClick={() => handleAction('escalate', selected)} className="px-4 py-2 rounded-lg bg-rose-500 text-black">Escalate Issue</button>
                </div>
              </div>
            </div>

              <div className="p-4 border-t border-slate-800 text-right">
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit / logs panel wired to QRProvider productionRecords */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <p className="text-sm text-slate-400 mb-3">Recent Production Events (audit)</p>
        {Array.isArray(productionRecords) && productionRecords.length > 0 ? (
          <div className="space-y-2">
            {productionRecords.slice(0, 8).map((rec, idx) => (
              <div key={rec.id || idx} className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-slate-300">
                <div className="font-medium text-white">{rec.employeeName || rec.operator || rec.employeeId || 'Unknown'}</div>
                <div className="text-xs text-slate-400">{rec.department || rec.section || rec.dept || 'Unknown'} • {new Date(rec.scannedAt || rec.recordedAt || rec.createdAt || Date.now()).toLocaleString()}</div>
                <div className="mt-1 text-xs">{rec.summary || rec.notes || JSON.stringify(rec.data || rec.raw || rec, null, 0).slice(0, 120)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">No production records available.</div>
        )}
      </div>

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirm(null)} />
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-6">
            <h3 className="text-lg font-semibold text-white">Confirm action</h3>
            <p className="text-sm text-slate-400 mt-2">Are you sure you want to <span className="font-semibold">{confirm.action}</span> on <span className="font-medium">{confirm.section.name}</span>?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => confirmAction(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300">Cancel</button>
              <button onClick={() => confirmAction(true)} className="px-4 py-2 rounded-lg bg-emerald-500 text-black">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
