import { useState, useEffect } from 'react'
import {
  Flag, Trash2, Search, RefreshCw, AlertCircle,
  HelpCircle, Sparkles, AlertTriangle, Check, X, Eye
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface Report {
  id: string
  reporterId: string
  reporterName: string
  reporterEmail: string
  hotelId: string
  hotelName: string
  reason: string
  imageUrls: string[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  adminNote: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PENDING: {
    label: 'Chờ duyệt',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-100'
  },
  APPROVED: {
    label: 'Đã đình chỉ',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-100'
  },
  REJECTED: {
    label: 'Đã bác bỏ',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-100'
  }
}

const TABS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED']

export const ReportManagePage = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  
  // Lightbox Zoom
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Resolve Modal
  const [actionReport, setActionReport] = useState<Report | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/api/admin/reports')
      setReports(res.data || [])
    } catch (err) {
      console.error('Failed to load reports', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  const handleOpenActionModal = (report: Report, type: 'approve' | 'reject') => {
    setActionReport(report)
    setActionType(type)
    setAdminNote(type === 'approve' ? 'Khách sạn bị đình chỉ hoạt động do phản hồi lừa đảo/vi phạm quy định.' : 'Báo cáo vi phạm không có cơ sở xác thực.')
  }

  const handleConfirmAction = async () => {
    if (!actionReport || !actionType) return
    setProcessing(actionReport.id)
    try {
      const endpoint = `/api/admin/reports/${actionReport.id}/${actionType}`
      const res = await axiosInstance.patch(endpoint, { adminNote })
      
      // Update locally
      setReports(prev => prev.map(r => r.id === actionReport.id ? res.data : r))
      
      setActionReport(null)
      setActionType(null)
      alert(actionType === 'approve' ? 'Đã duyệt báo cáo và ĐÌNH CHỈ khách sạn thành công!' : 'Đã bác bỏ báo cáo vi phạm thành công!')
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi xử lý báo cáo.')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = reports.filter(r => {
    const matchesTab = activeTab === 'ALL' || r.status === activeTab
    const matchesSearch = r.hotelName?.toLowerCase().includes(search.toLowerCase()) ||
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.reporterEmail?.toLowerCase().includes(search.toLowerCase()) ||
      r.reporterName?.toLowerCase().includes(search.toLowerCase())
    return matchesTab && matchesSearch
  })

  const counts = TABS.reduce((acc, tab) => ({
    ...acc,
    [tab]: tab === 'ALL' ? reports.length : reports.filter(r => r.status === tab).length
  }), {} as Record<string, number>)

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen text-left">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Giám sát hệ thống</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Báo cáo Vi phạm</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Xét duyệt các phản ánh lừa đảo, thông tin sai lệch từ khách hàng và đình chỉ các khách sạn vi phạm</p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-all bg-white cursor-pointer"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {TABS.map((tab, i) => {
          const config = STATUS_CONFIG[tab] || { label: 'Tất cả báo cáo', bg: 'bg-[#faf9f6]', text: 'text-[#303330]' }
          return (
            <div key={i} className="bg-white p-4 rounded-2xl border border-[#e5d8d0] text-center" style={cardShadow}>
              <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">
                {tab === 'ALL' ? 'Tổng số báo cáo' : config.label}
              </p>
              <p className="text-2xl font-black text-[#303330]">{loading ? '—' : counts[tab]}</p>
            </div>
          )
        })}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] p-5 mb-6 flex gap-4 items-center flex-wrap" style={cardShadow}>
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo khách sạn, lý do, email..."
            className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#fa7150]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const config = STATUS_CONFIG[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#fa7150] text-white border-[#fa7150]'
                    : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#fa7150]'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả' : config?.label}
                <span className="ml-1.5 opacity-70">({counts[tab]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid/Table content */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#faf9f6] border-b border-[#e5d8d0]">
              {['Khách sạn bị báo cáo', 'Nội dung phản ánh', 'Ảnh minh chứng', 'Người báo cáo', 'Thời gian', 'Trạng thái', 'Thao tác'].map((h, i) => (
                <th key={i} className="p-4 text-left text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5d8d0]/60">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <Flag size={40} className="text-[#e5d8d0] mx-auto mb-3" />
                  <p className="text-[#8a7e75] font-bold text-sm">Không có báo cáo vi phạm nào</p>
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                const config = STATUS_CONFIG[r.status]
                return (
                  <tr key={r.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                    {/* Hotel Name */}
                    <td className="p-4 font-bold text-[#303330] text-xs">
                      {r.hotelName}
                    </td>

                    {/* Content */}
                    <td className="p-4 max-w-sm">
                      <p className="text-xs text-[#303330] leading-relaxed font-bold break-words">{r.reason}</p>
                      {r.adminNote && (
                        <div className="mt-2 p-2 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl text-[10px] text-[#8a7e75] font-semibold">
                          <span className="font-bold text-[#fa7150] block mb-0.5">Phản hồi của Admin:</span>
                          {r.adminNote}
                        </div>
                      )}
                    </td>

                    {/* Images */}
                    <td className="p-4">
                      {r.imageUrls && r.imageUrls.length > 0 ? (
                        <div className="flex gap-1.5 flex-wrap">
                          {r.imageUrls.map((url, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setSelectedImage(url)}
                              className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#e5d8d0] cursor-zoom-in group"
                            >
                              <img src={url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <Eye size={12} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8a7e75] italic">Không có ảnh</span>
                      )}
                    </td>

                    {/* Reporter */}
                    <td className="p-4">
                      <p className="text-xs font-bold text-[#303330]">{r.reporterName}</p>
                      <p className="text-[10px] text-[#8a7e75] mt-0.5">{r.reporterEmail}</p>
                    </td>

                    {/* Sent time */}
                    <td className="p-4">
                      <p className="text-xs text-[#8a7e75]">
                        {new Date(r.createdAt).toLocaleString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center text-[10px] font-black px-3 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}>
                        {config.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      {r.status === 'PENDING' ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenActionModal(r, 'approve')}
                            disabled={processing === r.id}
                            className="flex items-center justify-center p-2 rounded-xl text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-all cursor-pointer"
                            title="Đồng ý báo cáo (Đình chỉ khách sạn)"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(r, 'reject')}
                            disabled={processing === r.id}
                            className="flex items-center justify-center p-2 rounded-xl text-rose-500 border border-rose-200 hover:bg-rose-50 transition-all cursor-pointer"
                            title="Bác bỏ báo cáo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8a7e75] italic">Đã xử lý</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── IMAGE ZOOM LIGHTBOX ── */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <img src={selectedImage} className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
        </div>
      )}

      {/* ── ACTION NOTE MODAL ── */}
      {actionReport && actionType && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl text-left border border-[#e5d8d0] animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-[#303330] mb-2">
              {actionType === 'approve' ? 'Đồng ý & Đình chỉ Khách sạn' : 'Bác bỏ báo cáo vi phạm'}
            </h3>
            <p className="text-xs text-[#8a7e75] mb-5">
              {actionType === 'approve' 
                ? 'Xem lại nội dung báo cáo bên dưới và nhập lý do đình chỉ cụ thể.' 
                : 'Xem lại nội dung báo cáo bên dưới và nhập lý do từ chối đơn.'}
            </p>

            {/* Chi tiết nội dung báo cáo & hình ảnh bằng chứng */}
            <div className="bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl p-4 mb-5 text-xs font-semibold text-[#5a5550] space-y-3">
              <div>
                <span className="text-[10px] font-black text-[#8a7e75] uppercase block mb-1">Khách sạn bị báo cáo</span>
                <span className="text-[#303330] font-black text-sm">{actionReport.hotelName}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-[#8a7e75] uppercase block mb-1">Nội dung báo cáo</span>
                <p className="text-[#303330] leading-relaxed font-bold break-words">{actionReport.reason}</p>
              </div>
              {actionReport.imageUrls && actionReport.imageUrls.length > 0 && (
                <div>
                  <span className="text-[10px] font-black text-[#8a7e75] uppercase block mb-1.5">Ảnh chứng cứ (Click để phóng to)</span>
                  <div className="flex gap-2 flex-wrap">
                    {actionReport.imageUrls.map((url, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setSelectedImage(url)}
                        className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#e5d8d0] cursor-zoom-in hover:opacity-90 transition-opacity shrink-0"
                      >
                        <img src={url} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-[#8a7e75] mb-2 uppercase">Nội dung ghi chú phạt *</label>
                <textarea
                  rows={4}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="Nhập ghi chú xử phạt..."
                  className="w-full p-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl outline-none focus:border-[#fa7150] font-medium"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setActionReport(null); setActionType(null) }}
                  className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6] cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={processing === actionReport.id || !adminNote.trim()}
                  className={`flex-1 py-3 rounded-2xl text-white text-sm font-bold transition-all text-center cursor-pointer disabled:opacity-50 ${
                    actionType === 'approve' ? 'bg-[#fa7150] hover:bg-[#a43e24]' : 'bg-stone-700 hover:bg-stone-900'
                  }`}
                >
                  {processing === actionReport.id ? 'Đang lưu...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
