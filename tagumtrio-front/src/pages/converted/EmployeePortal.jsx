import { Bell, Calendar as CalendarIcon, FileText, Briefcase, Megaphone, QrCode, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../context/auth-context'
import { useQr } from '../../context/qr-context'
import Portal from '../../components/ui/Portal'

export default function EmployeePortal() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { submitScan } = useQr()

  const [showScanner, setShowScanner] = useState(false)
  const [product, setProduct] = useState('')
  const [pieces, setPieces] = useState(1)
  const [scannedAt, setScannedAt] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  function handleSimulateScan() {
    // demo: populate with example payload parsed from a physical QR
    const sample = {
      product: 'Marine Plywood 3/4"',
      pieces: 12,
    }
    setProduct(sample.product)
    setPieces(sample.pieces)
    setStatusMessage('Parsed QR payload (demo). Review and submit.')
  }

  function handleSubmitScan(e) {
    e?.preventDefault()
    if (!user) return
    const record = {
      workerId: user.id,
      workerName: user.name,
      department: user.department || 'Production',
      product,
      pieces,
      scannedAt: new Date().toISOString(),
      source: 'camera-demo',
    }
    submitScan(record)
    setScannedAt(record.scannedAt)
    setStatusMessage('Scan submitted — waiting for Leadman verification.')
    setTimeout(() => setShowScanner(false), 900)
  }

  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    setModalOpen(showScanner)
  }, [showScanner])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-slate-300 border-4 border-slate-950 shadow-xl">{user?.name?.split(' ').map(n=>n[0]).join('')}</div>
          <div className="text-center sm:text-left flex-1">
            <h2 className="text-3xl font-bold text-white">{user?.name || 'Employee'}</h2>
            <p className="text-emerald-400 font-medium mt-1">{user?.role === 'employee' ? `${user.department} Dept` : user?.role}</p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-400">
              <span className="flex items-center gap-1"><Briefcase className="w-4 h-4"/> ID: {user?.id || '—'}</span>
              <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4"/> Joined: Jan 2025</span>
            </div>
          </div>
          <div className="flex gap-3">
            {user?.role === 'employee' && (
              <button onClick={() => { setShowScanner(true); handleSimulateScan() }} className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2.5 rounded-lg font-medium flex items-center gap-2" aria-label="Start scanner and parse QR demo">
                <QrCode className="w-5 h-5" /> Scan Physical QR (demo)
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-blue-400"/> Official Announcements</h3>
            <div className="space-y-4">
              <div className="border-l-2 border-blue-500 pl-4 py-1">
                <p className="text-xs text-slate-500 mb-1">May 28, 2026 • Management</p>
                <h4 className="text-slate-200 font-medium">New Safety Protocol in Drying Section</h4>
                <p className="text-sm text-slate-400 mt-1">Please review the updated safety guidelines posted near the main dryers.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Briefcase className="w-5 h-5 text-emerald-400"/> My Production Logs (Today)</h3>
              <span className="text-emerald-400 font-medium text-sm">Total: —</span>
            </div>
            <div className="space-y-3">
                <div className="text-slate-400 p-4 rounded-lg border border-slate-800 transform hover:scale-[1.01] transition-transform">Use the Scan action to submit production logs by scanning the physical QR at the workstation.</div>
              </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400"/> Quick Actions</h3>
            <div className="space-y-3">
              <button onClick={() => navigate('/portal/leaves')} className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors group"><span className="text-slate-300 font-medium group-hover:text-white">File Leave</span><span className="text-slate-500">→</span></button>
              <button onClick={() => navigate('/portal/payslips')} className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors group"><span className="text-slate-300 font-medium group-hover:text-white">View Payslips</span><span className="text-slate-500">→</span></button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Upcoming Schedule</h3>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2"></div>
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium text-white">Tomorrow</p>
                  <p className="text-xs text-slate-400">Regular Shift (8:00 AM - 5:00 PM)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showScanner && (
        <Portal>
          <div className={`fixed left-0 right-0 top-16 bottom-0 flex items-center justify-center bg-black/40 p-4 transition-opacity duration-200 z-30 ${modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative transform transition-all duration-200 z-40 ${modalOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
              <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              <h3 className="text-lg font-bold text-white mb-3">Camera Scan — Demo</h3>
              <p className="text-sm text-slate-400 mb-4">This demo simulates scanning a physical QR and extracting the payload. Use "Simulate Scan" to populate values, then submit.</p>

              <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <button type="button" onClick={handleSimulateScan} className="px-3 py-2 bg-slate-800 text-slate-200 rounded">Simulate Scan</button>
                  <button type="button" onClick={() => { setProduct(''); setPieces(1); setStatusMessage('') }} className="px-3 py-2 bg-slate-800 text-slate-200 rounded">Clear</button>
                </div>
                {statusMessage && <div className="text-sm text-emerald-400">{statusMessage}</div>}
              </div>

              <form onSubmit={handleSubmitScan} className="space-y-3">
                <label className="text-sm text-slate-400">Product</label>
                <input value={product} onChange={e => setProduct(e.target.value)} className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-white" />
                <label className="text-sm text-slate-400">Pieces</label>
                <input type="number" min="1" value={pieces} onChange={e => setPieces(Number(e.target.value))} className="w-full p-2 rounded bg-slate-950 border border-slate-800 text-white" />

                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={() => setShowScanner(false)} className="px-3 py-2 rounded bg-slate-800 text-slate-300">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded bg-emerald-500 text-black">Submit Scan</button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
