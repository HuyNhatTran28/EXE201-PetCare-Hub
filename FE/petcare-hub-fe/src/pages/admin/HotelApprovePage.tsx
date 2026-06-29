import { useState, useEffect } from 'react'
import {
  Building, Search, RefreshCw, CheckCircle,
  XCircle, Ban, Star, MapPin, Eye, X, ExternalLink
} from 'lucide-react'
import { cleanAddressDisplay } from '@/utils/cleanAddress'
import { maskAccountNumber } from '@/utils/maskAccountNumber'
import axiosInstance from '@/lib/axios'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:  { label: 'Chờ duyệt',   bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  ACTIVE:   { label: 'Hoạt động',   bg: 'bg-emerald-50 border-emerald-200',text: 'text-emerald-700',dot: 'bg-emerald-500' },
  REJECTED: { label: 'Từ chối',     bg: 'bg-rose-50 border-rose-200',    text: 'text-rose-600',   dot: 'bg-rose-500' },
}

const TABS = ['ALL', 'PENDING', 'ACTIVE', 'REJECTED']

export const HotelApprovePage = () => {
  const [hotels, setHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedHotel, setSelectedHotel] = useState<any | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)

  useEffect(() => {
    if (selectedHotel) {
      setLoadingRooms(true)
      axiosInstance.get(`/api/room-types/hotel/${selectedHotel.id}?activeOnly=false`)
        .then(res => {
          setRoomTypes(res.data || [])
        })
        .catch(err => {
          console.error("Failed to load room types for approval:", err)
          setRoomTypes([])
        })
        .finally(() => {
          setLoadingRooms(false)
        })
    } else {
      setRoomTypes([])
    }
  }, [selectedHotel])

  const parseDescription = (desc: string) => {
    if (!desc) return null
    try {
      if (desc.trim().startsWith('{')) {
        return JSON.parse(desc)
      }
    } catch (err) {
      console.error('Failed to parse description JSON:', err)
    }
    return null
  }

  const fetchHotels = async () => {
    setLoading(true)
    try {
      const params: any = { page: 0, size: 100 }
      if (activeTab !== 'ALL') {
        params.status = activeTab
      }
      const res = await axiosInstance.get('/api/admin/hotels', { params })
      setHotels(res.data.content || [])
    } catch (err) {
      console.error('Failed to load hotels', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHotels()
  }, [activeTab])

  useEffect(() => {
    if (selectedHotel || rejectTarget) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [selectedHotel, rejectTarget])

  const handleApprove = async (hotelId: string) => {
    if (!confirm('Xác nhận duyệt khách sạn này?')) return
    setProcessing(hotelId)
    try {
      await axiosInstance.patch(`/api/admin/hotels/${hotelId}/approve`)
      setHotels(prev => prev.map(h =>
        h.id === hotelId ? { ...h, status: 'ACTIVE', rejectionReason: null } : h
      ))
    } catch {
      alert('Không thể duyệt khách sạn')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (hotelId: string, reason: string) => {
    if (!reason.trim()) { alert('Vui lòng nhập lý do từ chối'); return }
    setProcessing(hotelId)
    try {
      await axiosInstance.patch(`/api/admin/hotels/${hotelId}/reject`, { reason: reason.trim() })
      setHotels(prev => prev.map(h =>
        h.id === hotelId ? { ...h, status: 'REJECTED', rejectionReason: reason.trim() } : h
      ))
      setRejectTarget(null)
      setRejectReason('')
    } catch {
      alert('Không thể từ chối khách sạn')
    } finally {
      setProcessing(null)
    }
  }

  const handleSuspend = async (hotelId: string) => {
    if (!confirm('Tạm ngưng hoạt động khách sạn này?')) return
    setProcessing(hotelId)
    try {
      await axiosInstance.patch(`/api/hotels/${hotelId}/status?status=PENDING`)
      setHotels(prev => prev.map(h =>
        h.id === hotelId ? { ...h, status: 'PENDING' } : h
      ))
    } catch {
      alert('Không thể tạm ngưng khách sạn')
    } finally {
      setProcessing(null)
    }
  }

  const filtered = hotels.filter(h =>
    h.name?.toLowerCase().includes(search.toLowerCase()) ||
    (h.address || '').toLowerCase().includes(search.toLowerCase())
  )

  const counts = TABS.reduce((acc, tab) => ({
    ...acc,
    [tab]: tab === 'ALL' ? hotels.length : hotels.filter(h => h.status === tab).length
  }), {} as Record<string, number>)

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  return (
    <div className="p-10 min-h-screen text-left">

      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Quản trị hệ thống</span>
          <h1 className="text-4xl font-black text-[#303330] mt-1">Quản lý Khách Sạn</h1>
          <p className="text-[#8a7e75] text-sm mt-1">Phê duyệt, từ chối và quản lý danh sách khách sạn đối tác</p>
        </div>
        <button onClick={fetchHotels}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:text-[#fa7150] hover:border-[#fa7150] transition-all bg-white"
        >
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {TABS.map((tab, i) => {
          const cfg = STATUS_CONFIG[tab]
          return (
            <div key={i} className="bg-white p-6 rounded-3xl border border-[#e5d8d0]" style={cardShadow}>
              <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">
                {tab === 'ALL' ? 'Tất cả khách sạn' : cfg?.label}
              </p>
              <p className="text-3xl font-black text-[#303330]">{loading ? '—' : counts[tab]}</p>
            </div>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] p-5 mb-6 flex gap-4 items-center flex-wrap" style={cardShadow}>
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm khách sạn..."
            className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-2.5 pl-10 pr-4 text-xs outline-none focus:border-[#fa7150]"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABS.map(tab => {
            const cfg = STATUS_CONFIG[tab]
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTab === tab
                    ? 'bg-[#fa7150] text-white border-[#fa7150]'
                    : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#fa7150]'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả' : cfg?.label}
                <span className="ml-1.5 opacity-70">({counts[tab]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-white rounded-3xl border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#faf9f6] border-b border-[#e5d8d0]">
              {['Khách sạn', 'Địa chỉ', 'Đánh giá', 'Loại thú cưng', 'Trạng thái', 'Thao tác'].map((h, i) => (
                <th key={i} className="p-4 text-left text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5d8d0]/60">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-20 text-center">
                  <Building size={40} className="text-[#e5d8d0] mx-auto mb-3" />
                  <p className="text-[#8a7e75] font-bold text-sm">Không có khách sạn nào</p>
                </td>
              </tr>
            ) : (
              filtered.map(hotel => {
                const cfg = STATUS_CONFIG[hotel.status] || STATUS_CONFIG.PENDING
                return (
                  <tr key={hotel.id} className="hover:bg-[#faf9f6]/50 transition-colors">
                    {/* Hotel info */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#faf9f6] border border-[#e5d8d0] shrink-0 flex items-center justify-center">
                          {hotel.imageUrls && hotel.imageUrls.length > 0 ? (
                            <img 
                              src={hotel.imageUrls[0]} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <Building size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#303330]">{hotel.name}</p>
                          <p className="text-[10px] text-[#8a7e75] font-semibold">{hotel.phone || 'Chưa có SĐT'}</p>
                        </div>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="p-4">
                      <p className="text-xs text-[#5a5550] flex items-center gap-1">
                        <MapPin size={12} className="text-[#fa7150]" /> {cleanAddressDisplay(hotel.address || 'Hồ Chí Minh, Việt Nam')}
                      </p>
                    </td>

                    {/* Rating */}
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={12} fill="currentColor" />
                        <span className="text-xs font-black text-[#303330]">{hotel.averageRating || '—'}</span>
                      </div>
                    </td>

                    {/* Allowed pets */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {(hotel.allowedPetTypes || ['Dogs', 'Cats']).map((tag: string, idx: number) => (
                          <span key={idx} className="bg-purple-50 text-purple-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedHotel(hotel)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-sky-200 text-sky-600 hover:bg-sky-50 transition-all cursor-pointer"
                        >
                          <Eye size={12} /> Chi tiết
                        </button>
                        {hotel.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(hotel.id)}
                              disabled={processing === hotel.id}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                            >
                              <CheckCircle size={12} /> Duyệt
                            </button>
                            <button
                              onClick={() => { setRejectTarget(hotel.id); setRejectReason('') }}
                              disabled={processing === hotel.id}
                              className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              <XCircle size={12} /> Từ chối
                            </button>
                          </>
                        )}
                        {hotel.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleSuspend(hotel.id)}
                            disabled={processing === hotel.id}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-amber-200 text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                          >
                            <Ban size={12} /> Tạm ngưng
                          </button>
                        )}
                        {hotel.status === 'REJECTED' && (
                          <button
                            onClick={() => handleApprove(hotel.id)}
                            disabled={processing === hotel.id}
                            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold border border-stone-200 text-[#8a7e75] hover:bg-[#faf9f6] transition-all cursor-pointer"
                          >
                            <RefreshCw size={12} /> Duyệt lại
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DETAILS MODAL */}
      {selectedHotel && (() => {
        const details = parseDescription(selectedHotel.description)
        const cfg = STATUS_CONFIG[selectedHotel.status] || STATUS_CONFIG.PENDING
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 bg-[#faf9f6] border-b border-[#e5d8d0] flex items-center justify-between">
                <div>
                  <span className="text-[#fa7150] text-[9px] font-black uppercase tracking-widest">Chi tiết đăng ký đối tác</span>
                  <h2 className="text-2xl font-black text-[#303330] mt-0.5">{selectedHotel.name}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <button
                    onClick={() => setSelectedHotel(null)}
                    className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-8 overflow-y-auto space-y-6 flex-1 text-xs">
                {/* Rejection reason alert */}
                {selectedHotel.status === 'REJECTED' && selectedHotel.rejectionReason && (
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider mb-1">Lý do từ chối</p>
                    <p className="text-rose-700 font-semibold">{selectedHotel.rejectionReason}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: basic info & banking */}
                  <div className="space-y-6">
                    {/* Hotel basic information */}
                    <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-3">
                      <h3 className="text-[11px] font-black text-[#fa7150] uppercase tracking-wider border-b border-[#e5d8d0] pb-1.5">Thông tin cơ sở</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Tên cơ sở</p>
                          <p className="text-gray-800 font-bold">{selectedHotel.name}</p>
                        </div>
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Số điện thoại</p>
                          <p className="text-gray-800 font-bold">{selectedHotel.phone || 'Chưa cung cấp'}</p>
                        </div>
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Giờ mở cửa</p>
                          <p className="text-gray-800 font-bold">{selectedHotel.checkInTime || '08:00'}</p>
                        </div>
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Giờ đóng cửa</p>
                          <p className="text-gray-800 font-bold">{selectedHotel.checkOutTime || '20:00'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[#8a7e75] uppercase text-[9px]">Địa chỉ</p>
                        <p className="text-gray-800 font-bold flex items-start gap-1">
                          <MapPin size={12} className="text-[#fa7150] mt-0.5 shrink-0" />
                          <span>{cleanAddressDisplay(selectedHotel.address)}</span>
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-gray-100">
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Vĩ độ (Lat)</p>
                          <p className="text-gray-800 font-mono font-bold">{selectedHotel.locationLat || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Kinh độ (Lng)</p>
                          <p className="text-gray-800 font-mono font-bold">{selectedHotel.locationLong || '—'}</p>
                        </div>
                      </div>
                      {selectedHotel.googleMapsUrl && (
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Bản đồ Google Maps</p>
                          <a
                            href={selectedHotel.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#fa7150] hover:underline flex items-center gap-1 font-bold mt-0.5"
                          >
                            Xem trên Google Maps <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Services and allowed pets */}
                    <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-3">
                      <h3 className="text-[11px] font-black text-[#fa7150] uppercase tracking-wider border-b border-[#e5d8d0] pb-1.5">Dịch vụ & Đối tượng nhận</h3>
                      <div>
                        <p className="text-[#8a7e75] uppercase text-[9px] mb-1">Dịch vụ cung cấp</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedHotel.amenities && selectedHotel.amenities.length > 0 ? (
                            selectedHotel.amenities.map((item: string, idx: number) => (
                              <span key={idx} className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-lg font-bold">
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 font-normal">Chưa thiết lập</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[#8a7e75] uppercase text-[9px] mb-1">Đối tượng nhận nuôi</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedHotel.allowedPetTypes || ['Dogs', 'Cats']).map((tag: string, idx: number) => (
                            <span key={idx} className="bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-lg font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Banking info */}
                    <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-3">
                      <h3 className="text-[11px] font-black text-[#fa7150] uppercase tracking-wider border-b border-[#e5d8d0] pb-1.5">Thông tin tài khoản ngân hàng</h3>
                      {details?.banking ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[9px]">Tên ngân hàng</p>
                            <p className="text-gray-800 font-bold">{details.banking.bankName || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[9px]">Số tài khoản</p>
                            <p className="text-gray-800 font-bold font-mono text-sm">{details.banking.accountNumber ? maskAccountNumber(details.banking.accountNumber) : '—'}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[#8a7e75] uppercase text-[9px]">Tên chủ tài khoản</p>
                            <p className="text-gray-800 font-black uppercase text-sm">{details.banking.accountName || '—'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-400 font-normal">Không có thông tin ngân hàng thụ hưởng</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: user owner basic, ekyc cccd, licenses, images */}
                  <div className="space-y-6">
                    {/* Owner identification */}
                    <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-3">
                      <h3 className="text-[11px] font-black text-[#fa7150] uppercase tracking-wider border-b border-[#e5d8d0] pb-1.5">Hồ sơ định danh eKYC</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Họ tên đại diện</p>
                          <p className="text-gray-800 font-bold">{selectedHotel.partnerName || 'Chủ cơ sở'}</p>
                        </div>
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Số CCCD</p>
                          <p className="text-gray-800 font-bold font-mono">{details?.cccd?.number || 'Chưa cung cấp'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Legal documents */}
                    <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-3">
                      <h3 className="text-[11px] font-black text-[#fa7150] uppercase tracking-wider border-b border-[#e5d8d0] pb-1.5">Giấy tờ pháp lý hành nghề</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Giấy phép kinh doanh / MST</p>
                          {details?.legal?.businessLicenseUrl ? (
                            <a
                              href={details.legal.businessLicenseUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#fa7150] hover:underline flex items-center gap-1 font-bold mt-0.5"
                            >
                              Tải/Xem tài liệu <ExternalLink size={12} />
                            </a>
                          ) : (
                            <p className="text-gray-400 font-normal mt-0.5">Chưa tải lên</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[9px]">Chứng chỉ hành nghề thú y</p>
                          {details?.legal?.vetCertUrl ? (
                            <a
                              href={details.legal.vetCertUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#fa7150] hover:underline flex items-center gap-1 font-bold mt-0.5"
                            >
                              Tải/Xem tài liệu <ExternalLink size={12} />
                            </a>
                          ) : (
                            <p className="text-gray-400 font-normal mt-0.5">Không đính kèm</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Facility Images */}
                    <div className="bg-[#faf9f6] p-5 rounded-2xl border border-[#e5d8d0]/60 space-y-3">
                      <h3 className="text-[11px] font-black text-[#fa7150] uppercase tracking-wider border-b border-[#e5d8d0] pb-1.5">Hình ảnh cơ sở đăng ký</h3>
                      <div className="grid grid-cols-3 gap-2">
                        {details?.logoUrl ? (
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Ảnh Logo</p>
                            <a href={details.logoUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 bg-white aspect-square hover:opacity-90 transition-opacity">
                              <img src={details.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Ảnh Logo</p>
                            <div className="rounded-lg border border-dashed border-gray-200 bg-white aspect-square flex items-center justify-center text-gray-300 font-normal text-center">
                              Trống
                            </div>
                          </div>
                        )}
                        {details?.frontUrl ? (
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Ảnh Mặt tiền</p>
                            <a href={details.frontUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 bg-white aspect-square hover:opacity-90 transition-opacity">
                              <img src={details.frontUrl} alt="Mặt tiền" className="w-full h-full object-cover" />
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Ảnh Mặt tiền</p>
                            <div className="rounded-lg border border-dashed border-gray-200 bg-white aspect-square flex items-center justify-center text-gray-300 font-normal text-center">
                              Trống
                            </div>
                          </div>
                        )}
                        {details?.roomsUrl ? (
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Ảnh Phòng ốc</p>
                            <a href={details.roomsUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-gray-200 bg-white aspect-square hover:opacity-90 transition-opacity">
                              <img src={details.roomsUrl} alt="Phòng ốc" className="w-full h-full object-cover" />
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Ảnh Phòng ốc</p>
                            <div className="rounded-lg border border-dashed border-gray-200 bg-white aspect-square flex items-center justify-center text-gray-300 font-normal text-center">
                              Trống
                            </div>
                          </div>
                        )}
                      </div>
                      {details?.imageUrls && details.imageUrls.length > 0 && (
                        <div>
                          <p className="text-[#8a7e75] uppercase text-[8px] mb-1">Album ảnh khác ({details.imageUrls.length})</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {details.imageUrls.map((url: string, idx: number) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-md overflow-hidden border border-gray-200 bg-white aspect-square hover:opacity-90 transition-opacity">
                                <img src={url} alt={`Album ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room Types Section */}
                <div className="border-t border-[#e5d8d0] pt-6 mt-6">
                  <div className="bg-[#faf9f6] p-6 rounded-3xl border border-[#e5d8d0]/60 space-y-4">
                    <div className="flex justify-between items-center border-b border-[#e5d8d0] pb-2">
                      <h3 className="text-xs font-black text-[#fa7150] uppercase tracking-wider">
                        Danh sách loại phòng đã thiết lập ({roomTypes.length})
                      </h3>
                      {loadingRooms && <span className="text-[10px] text-stone-400 italic">Đang tải thông tin phòng...</span>}
                    </div>

                    {roomTypes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        {roomTypes.map((room: any, idx: number) => (
                          <div key={idx} className="bg-white p-4 rounded-2xl border border-[#e5d8d0] shadow-sm flex flex-col md:flex-row gap-4">
                            {/* Room image */}
                            <div className="w-24 h-24 md:w-28 md:h-20 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                              {room.images && room.images.length > 0 ? (
                                <img src={room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 italic">Không có ảnh</div>
                              )}
                            </div>
                            
                            {/* Room info */}
                            <div className="flex-1 space-y-1 text-[11px]">
                              <p className="font-bold text-stone-800 text-xs">{room.name}</p>
                              <p className="text-stone-600 line-clamp-2" title={room.description}>{room.description || 'Chưa có mô tả'}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-stone-500 pt-1">
                                <span>Giá đêm: <strong className="text-[#fa7150]">{(room.pricePerNight || 0).toLocaleString('vi-VN')} đ</strong></span>
                                {room.dayRate !== null && room.dayRate !== undefined && (
                                  <span>Giá ngày: <strong className="text-[#fa7150]">{(room.dayRate).toLocaleString('vi-VN')} đ</strong></span>
                                )}
                                <span>Số phòng: <strong>{room.totalRooms}</strong></span>
                                <span>Pet tối đa: <strong>{room.maxPets}</strong></span>
                              </div>
                              {room.allowedPetTypes && room.allowedPetTypes.length > 0 && (
                                <div className="flex gap-1 pt-1.5">
                                  {room.allowedPetTypes.map((t: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[9px] font-black uppercase">
                                      {t === 'DOG' ? 'Chó' : t === 'CAT' ? 'Mèo' : t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !loadingRooms && <p className="text-stone-400 italic text-[11px] text-left">Cơ sở này chưa thiết lập loại phòng nào.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-[#faf9f6] border-t border-[#e5d8d0] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedHotel(null)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-[#f5ede8] hover:bg-[#e5d8d0] text-gray-700 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {selectedHotel.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { handleApprove(selectedHotel.id); setSelectedHotel(null) }}
                      disabled={processing === selectedHotel.id}
                      className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle size={14} /> Duyệt hoạt động
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedHotel(null); setRejectTarget(selectedHotel.id); setRejectReason('') }}
                      disabled={processing === selectedHotel.id}
                      className="px-5 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle size={14} /> Từ chối hồ sơ
                    </button>
                  </>
                )}
                {selectedHotel.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => { handleSuspend(selectedHotel.id); setSelectedHotel(null) }}
                    disabled={processing === selectedHotel.id}
                    className="px-5 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Ban size={14} /> Tạm ngưng hoạt động
                  </button>
                )}
                {selectedHotel.status === 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => { handleApprove(selectedHotel.id); setSelectedHotel(null) }}
                    disabled={processing === selectedHotel.id}
                    className="px-5 py-2.5 rounded-xl font-bold bg-[#fa7150] hover:bg-[#a43e24] text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} /> Duyệt lại hồ sơ
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* REJECT REASON DIALOG */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#e5d8d0] shadow-2xl w-full max-w-md p-8">
            <h3 className="text-lg font-black text-[#303330] mb-1">Từ chối hồ sơ</h3>
            <p className="text-xs text-[#8a7e75] mb-5">Nhập lý do để partner biết cần chỉnh sửa điều gì trước khi gửi duyệt lại.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Thiếu giấy phép kinh doanh, hình ảnh không rõ..."
              rows={4}
              className="w-full border border-[#e5d8d0] rounded-2xl p-3 text-xs outline-none focus:border-[#fa7150] resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason('') }}
                className="px-5 py-2.5 rounded-xl font-bold bg-[#f5ede8] hover:bg-[#e5d8d0] text-gray-700 transition-colors cursor-pointer text-sm"
              >
                Hủy
              </button>
              <button
                onClick={() => handleReject(rejectTarget, rejectReason)}
                disabled={processing === rejectTarget || !rejectReason.trim()}
                className="px-5 py-2.5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors cursor-pointer text-sm"
              >
                <XCircle size={14} /> Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
