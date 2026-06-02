import { useState } from 'react'
import { ChevronDown, Check, X, Image as ImageIcon } from 'lucide-react'

export default function ProductionReports() {
  const [activeTab, setActiveTab] = useState('pending')
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState(null)

  // Mock data - will be replaced with QR context data
  const pendingReports = [
    {
      id: 'RPT-001',
      leadmanName: 'John Doe',
      department: 'Production A',
      submittedAt: new Date().toISOString(),
      productName: 'Component X',
      thickness: '5mm',
      pieces: 150,
      photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
      notes: 'Quality check completed',
      status: 'SUBMITTED',
    },
    {
      id: 'RPT-002',
      leadmanName: 'Jane Smith',
      department: 'Production B',
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
      productName: 'Component Y',
      thickness: '8mm',
      pieces: 200,
      photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
      notes: 'Standard production run',
      status: 'SUBMITTED',
    },
  ]

  const verifiedReports = [
    {
      id: 'RPT-101',
      leadmanName: 'John Doe',
      department: 'Production A',
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 43200000).toISOString(),
      productName: 'Component X',
      thickness: '5mm',
      pieces: 150,
      photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
      notes: 'Quality check completed',
      status: 'VERIFIED',
    },
  ]

  function handleApprove(reportId) {
    alert(`Approved report ${reportId}`)
    // TODO: Call backend to update status to VERIFIED
  }

  function handleReject(reportId) {
    alert(`Rejected report ${reportId}`)
    // TODO: Call backend to update status to REJECTED
  }

  function handleSubmitToGM(reportId) {
    alert(`Submitting report ${reportId} to GM`)
    // TODO: Call backend to submit to GM
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const ReportCard = ({ report, isVerified = false }) => {
    const isExpanded = expandedReportId === report.id
    return (
      <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden hover:border-slate-700 transition-colors">
        <button
          onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-900 transition-colors"
        >
          <div className="flex-1 text-left">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-white font-medium">{report.id}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                report.status === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-300' :
                report.status === 'SUBMITTED' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-slate-700 text-slate-300'
              }`}>
                {report.status}
              </span>
            </div>
            <p className="text-sm text-slate-400">{report.leadmanName} • {report.department}</p>
            <p className="text-sm text-slate-500 mt-1">{report.productName} • {report.pieces} pcs</p>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
          <div className="border-t border-slate-800 p-4 space-y-4 bg-slate-900/50">
            {/* Details Section */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Product Name</p>
                <p className="text-white font-medium">{report.productName}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Thickness</p>
                <p className="text-white font-medium">{report.thickness}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Pieces</p>
                <p className="text-white font-medium">{report.pieces}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Department</p>
                <p className="text-white font-medium">{report.department}</p>
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-slate-500 text-xs mb-1">Notes</p>
              <p className="text-white text-sm bg-slate-950 p-3 rounded-lg">{report.notes}</p>
            </div>

            {/* Photos */}
            <div>
              <p className="text-slate-500 text-xs mb-2">Verification Photos</p>
              <button
                onClick={() => {
                  setSelectedPhotos(report.photos)
                  setShowPhotoModal(true)
                }}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                View 4 Photos
              </button>
            </div>

            {/* Timestamps */}
            <div className="text-xs text-slate-500 space-y-1">
              <p>Submitted: {formatDateTime(report.submittedAt)}</p>
              {report.verifiedAt && <p>Verified: {formatDateTime(report.verifiedAt)}</p>}
            </div>

            {/* Actions */}
            {!isVerified && report.status === 'SUBMITTED' && (
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleReject(report.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 rounded-lg font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprove(report.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg font-medium transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </div>
            )}

            {isVerified && report.status === 'VERIFIED' && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => handleSubmitToGM(report.id)}
                  className="w-full px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg font-medium transition-colors"
                >
                  Submit to GM
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Production Reports</h1>
        <p className="text-slate-400 mt-1">Review and verify submitted reports from department leadmen</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'pending'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Pending Review ({pendingReports.length})
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'verified'
              ? 'border-emerald-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          Verified ({verifiedReports.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'pending' && (
          pendingReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No pending reports</p>
            </div>
          ) : (
            pendingReports.map((report) => <ReportCard key={report.id} report={report} isVerified={false} />)
          )
        )}

        {activeTab === 'verified' && (
          verifiedReports.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No verified reports</p>
            </div>
          ) : (
            verifiedReports.map((report) => <ReportCard key={report.id} report={report} isVerified={true} />)
          )
        )}
      </div>

      {/* Photo Modal */}
      {showPhotoModal && selectedPhotos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-3xl max-h-[90vh] overflow-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Verification Photos</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {selectedPhotos.map((photo, idx) => (
                <div key={idx} className="aspect-square bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">{photo}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
