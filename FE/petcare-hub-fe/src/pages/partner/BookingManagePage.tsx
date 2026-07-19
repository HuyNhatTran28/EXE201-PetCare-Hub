import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  PawPrint,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  ArrowLeft,
  ArrowRight,
  Building,
  Camera
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'

interface Booking {
  id: string
  invoiceNumber: string
  ownerName: string
  roomTypeName: string
  checkInDate: string
  checkOutDate: string
  totalAmount: number
  status: 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED'
  createdAt?: string
  bookingType?: string
  dropOffTime?: string
  pickUpTime?: string
}

export const BookingManagePage = () => {
  const { user } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  
  const [hotelId, setHotelId] = useState<string | null>(null)
  const [hotels, setHotels] = useState<any[]>([])

  // State for Pet Diary Modal
  const [showDiaryModal, setShowDiaryModal] = useState(false)
  const [diaryBookingId, setDiaryBookingId] = useState<string | null>(null)
  const [diaryTitle, setDiaryTitle] = useState('')
  const [diaryContent, setDiaryContent] = useState('')
  const [diaryEating, setDiaryEating] = useState('')
  const [diaryMood, setDiaryMood] = useState('')
  const [diaryActivity, setDiaryActivity] = useState('')
  const [diaryImageUrl, setDiaryImageUrl] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)

  const fetchBookings = async () => {
    if (!hotelId) return
    setLoading(true)
    try {
      const response = await axiosInstance.get(`/api/bookings/hotel/${hotelId}`)
      const list = (response.data.content || []).map((b: any) => ({
        id: b.id,
        invoiceNumber: b.invoiceNumber,
        ownerName: b.ownerName || 'Khách hàng',
        roomTypeName: b.roomTypeName || 'Phòng nghỉ',
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: b.totalAmount || 0,
        status: b.status,
        createdAt: b.createdAt,
        bookingType: b.bookingType,
        dropOffTime: b.dropOffTime,
        pickUpTime: b.pickUpTime
      }))
      setBookings(list)
    } catch (error) {
      console.error('Failed to load bookings', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchHotel = async () => {
      try {
        const res = await axiosInstance.get('/api/hotels/my', {
          params: { page: 0, size: 100, sort: [] }
        })
        const fetchedHotels = res.data.content || []
        setHotels(fetchedHotels)
        if (fetchedHotels.length > 0) {
          // If we have selectedHotelId in localStorage or similar, we could use it, 
          // but defaulting to the first one is great as long as they can change it.
          setHotelId(fetchedHotels[0].id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch hotels', err)
        setLoading(false)
      }
    }
    fetchHotel()
  }, [])

  useEffect(() => {
    if (hotelId) fetchBookings()
  }, [hotelId])

  const handleConfirm = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/bookings/${id}/confirm`)
      fetchBookings()
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: 'Đã xác nhận đơn đặt phòng',
          message: `Đơn đặt phòng #${id.substring(0, 8).toUpperCase()} đã được duyệt thành công.`,
          type: 'booking',
          bookingId: id,
          hotelId
        }
      }))
    } catch (error) {
      alert('Không thể xác nhận: Vui lòng kiểm tra trạng thái thanh toán.')
    }
  }

  const handleCheckIn = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/bookings/${id}/checkin?checkinPhotoUrl=https://example.com/in.jpg&ownerSignatureUrl=https://example.com/sig.png`)
      fetchBookings()
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: 'Thú cưng đã Check-in',
          message: `Bảo mẫu đã hoàn thành thủ tục nhận bé cho đơn #${id.substring(0, 8).toUpperCase()}.`,
          type: 'booking',
          bookingId: id,
          hotelId
        }
      }))
    } catch (error) {
      alert('Không thể check-in: Đơn hàng cần ở trạng thái CONFIRMED.')
    }
  }

  const handleCheckOut = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/bookings/${id}/checkout`)
      fetchBookings()
      window.dispatchEvent(new CustomEvent('petcare-notification', {
        detail: {
          title: 'Thú cưng đã Check-out',
          message: `Đơn đặt phòng #${id.substring(0, 8).toUpperCase()} đã trả phòng và check-out hoàn tất.`,
          type: 'booking',
          bookingId: id,
          hotelId
        }
      }))
    } catch (error) {
      alert('Không thể check-out: Thú cưng chưa ở trạng thái CHECKED_IN.')
    }
  }

  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!diaryBookingId) return
    try {
      const payload = {
        bookingId: diaryBookingId,
        entryTitle: diaryTitle,
        entryContent: diaryContent,
        eating: diaryEating,
        mood: diaryMood,
        activity: diaryActivity,
        attachedMediaUrls: diaryImageUrl ? [diaryImageUrl] : []
      }
      await axiosInstance.post('/api/diaries', payload)
      alert('Đã cập nhật nhật ký cho bé thành công!')
      setShowDiaryModal(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật nhật ký.')
    }
  }

  // Filter & Search logic
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = b.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.roomTypeName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Theme Gradients
  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }
  const cardShadow = { boxShadow: '0 20px 40px rgba(164, 62, 36, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)' }

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—'
    const date = new Date(dateStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    const hours = pad(date.getHours())
    const minutes = pad(date.getMinutes())
    const day = pad(date.getDate())
    const month = pad(date.getMonth() + 1)
    const year = String(date.getFullYear()).slice(-2)
    return `${hours}:${minutes} - ${day}/${month}/${year}`
  }

  const formatDateCompact = (dateStr?: string) => {
    if (!dateStr) return '—'
    const parts = dateStr.split('-') // "2026-06-29"
    if (parts.length === 3) {
      const yearCompact = parts[0].slice(-2)
      return `${parts[2]}/${parts[1]}/${yearCompact}`
    }
    return dateStr
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING': 
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Chờ Thanh Toán',
          dot: 'bg-amber-500'
        }
      case 'CONFIRMED': 
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Đã Xác Nhận',
          dot: 'bg-blue-500'
        }
      case 'CHECKED_IN': 
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Đang Lưu Trú',
          dot: 'bg-purple-500'
        }
      case 'COMPLETED': 
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Đã Hoàn Tất',
          dot: 'bg-emerald-500'
        }
      default: 
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Đã Hủy',
          dot: 'bg-rose-500'
        }
    }
  }

  return (
    <div className="flex-grow flex flex-col min-w-0">

        {/* ── TOP UTILITIES BAR ── */}
        <header className="h-20 bg-white border-b border-[#e5d8d0] px-8 flex items-center justify-between shrink-0">
          {/* Header Back & Page Title */}
          <div className="flex items-center gap-4">
            <Link to="/partner/dashboard" className="w-10 h-10 rounded-full border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <span className="text-lg font-black tracking-tight text-[#303330]">Quản Lý Đặt Phòng (Bookings)</span>
          </div>

          {/* Right utility buttons */}
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchBookings} 
              className="w-10 h-10 rounded-full border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] transition-colors bg-white cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} />
            </button>
            <div className="w-[1px] h-6 bg-[#e5d8d0]" />
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-[#8a7e75]">{user?.fullName || 'Đối tác'}</span>
              <div className="w-9 h-9 rounded-full bg-[#fa7150]/10 border border-[#fa7150]/20 flex items-center justify-center font-black text-xs text-[#fa7150]">
                {user?.fullName?.charAt(0) || 'P'}
              </div>
            </div>
          </div>
        </header>

        {/* ── WORKSPACE CONTENT ── */}
        <div className="p-8 md:p-12 overflow-y-auto flex-grow max-w-[92rem] w-full mx-auto">
          
          {/* Global Hotel Context Selector */}
          {hotels.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-white border border-[#e5d8d0] rounded-2xl px-6 py-3.5 shadow-sm mb-8 text-left animate-fadeIn">
              <div className="flex items-center gap-2.5">
                <Building size={18} className="text-[#fa7150]" />
                <span className="text-xs font-black text-[#8a7e75] uppercase tracking-wider">Chọn cơ sở quản lý:</span>
                <select
                  value={hotelId || ''}
                  onChange={(e) => setHotelId(e.target.value)}
                  className="bg-transparent border-none text-sm font-black text-[#303330] focus:outline-none cursor-pointer hover:text-[#fa7150] transition-colors"
                >
                  {hotels.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Dashboard Title & Introduction */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 text-left">
            <div className="space-y-1.5">
              <h2 className="text-3xl font-black text-[#303330]">Trung Tâm Tiếp Nhận & Vận Hành</h2>
              <p className="text-xs text-[#8a7e75]">Xác nhận thanh toán, check-in khi thú cưng đến và check-out hoàn tất kỳ nghỉ dưỡng.</p>
            </div>

            {/* Quick Stats Summary */}
            <div className="flex gap-4 self-start md:self-end">
              <div className="bg-white border border-[#e5d8d0] rounded-2xl px-5 py-3 flex items-center gap-3" style={cardShadow}>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-[#8a7e75] block uppercase">Chờ xử lý</span>
                  <span className="text-sm font-black text-[#303330]">{bookings.filter(b => b.status === 'PENDING').length} đơn</span>
                </div>
              </div>

              <div className="bg-white border border-[#e5d8d0] rounded-2xl px-5 py-3 flex items-center gap-3" style={cardShadow}>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                  <PawPrint size={16} />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-bold text-[#8a7e75] block uppercase">Đang lưu trú</span>
                  <span className="text-sm font-black text-[#303330]">{bookings.filter(b => b.status === 'CHECKED_IN').length} bé</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── FILTER & SEARCH PANEL ── */}
          <div className="bg-white border border-[#e5d8d0] rounded-3xl p-6 mb-8 flex flex-col xl:flex-row gap-4 items-center justify-between" style={cardShadow}>
            {/* Search Input */}
            <div className="relative w-full xl:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm mã đặt phòng, khách hàng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl py-3 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-[#fa7150] transition-colors"
              />
            </div>

            {/* Filter Status Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap gap-1.5 w-full xl:w-auto overflow-x-auto no-scrollbar">
              {['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].map((st) => {
                const label = st === 'ALL' ? 'Tất Cả' : getStatusConfig(st).label;
                const isSelected = filterStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                      isSelected 
                        ? 'bg-[#fa7150] text-white shadow-md shadow-[#fa7150]/20' 
                        : 'bg-[#faf9f6] border border-[#e5d8d0] text-[#5a5550] hover:bg-[#faf9f6]/80'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── BOOKINGS LIST CONTAINER ── */}
          {loading ? (
            <div className="py-24 text-center text-[#8a7e75] font-bold text-sm flex flex-col items-center gap-3 bg-white border border-[#e5d8d0] rounded-3xl">
              <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin"></span>
              Đang tải danh sách đặt phòng...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-20 text-center border border-[#e5d8d0] bg-white rounded-[32px] p-8">
              <div className="w-16 h-16 rounded-full bg-[#fa7150]/10 flex items-center justify-center text-[#fa7150] mx-auto mb-4">
                <AlertCircle size={28} />
              </div>
              <p className="text-[#8a7e75] font-black text-sm">Không tìm thấy đơn đặt phòng nào phù hợp.</p>
            </div>
          ) : (
            <div className="bg-white border border-[#e5d8d0] rounded-[32px] overflow-x-auto shadow-[0_8px_30px_rgb(0,0,0,0.01)] text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fdfaf8] border-b border-[#e5d8d0]/60 text-[10px] font-black uppercase text-[#8a7e75] tracking-wider text-left">
                    <th className="px-4 py-4.5 whitespace-nowrap">Mã Đơn</th>
                    <th className="px-4 py-4.5 whitespace-nowrap">Thời Gian Đặt</th>
                    <th className="px-4 py-4.5 whitespace-nowrap">Chủ Thú Cưng</th>
                    <th className="px-4 py-4.5 whitespace-nowrap">Hạng Phòng</th>
                    <th className="px-4 py-4.5 whitespace-nowrap">Thời Gian Lưu Trú</th>
                    <th className="px-4 py-4.5 whitespace-nowrap">Chi Phí</th>
                    <th className="px-4 py-4.5 whitespace-nowrap">Trạng Thái</th>
                    <th className="px-4 py-4.5 whitespace-nowrap text-right">Vận Hành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5d8d0]/60 text-xs font-semibold">
                  {filteredBookings.map((booking) => {
                    const cfg = getStatusConfig(booking.status);
                    return (
                      <tr key={booking.id} className="hover:bg-[#faf9f6]/40 transition-colors">
                        {/* Invoice Number */}
                        <td className="px-4 py-4 whitespace-nowrap font-mono font-black text-[#fa7150] text-[11px]">#{booking.invoiceNumber}</td>
                        
                        {/* Created At / Booking Time */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-[#8a7e75] font-bold text-xs">
                            {formatDateTime(booking.createdAt)}
                          </span>
                        </td>
                        
                        {/* Customer Name */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#fa7150]/10 border border-[#fa7150]/20 flex items-center justify-center text-xs font-black text-[#fa7150]">
                              {booking.ownerName.charAt(0)}
                            </div>
                            <span className="font-bold text-[#303330]">{booking.ownerName}</span>
                          </div>
                        </td>
 
                        {/* Room Type */}
                        <td className="px-4 py-4 whitespace-nowrap text-[#5a5550]">{booking.roomTypeName}</td>
 
                        {/* Dates */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="flex items-center gap-2 text-[#5a5550]">
                              <span className="font-bold text-[#303330]">{formatDateCompact(booking.checkInDate)}</span>
                              <ArrowRight size={10} className="text-[#fa7150]" />
                              <span className="font-bold text-[#303330]">{formatDateCompact(booking.checkOutDate)}</span>
                            </div>
                            <span className="text-[10px] text-[#fa7150] font-bold mt-1.5 block">
                              {booking.bookingType === 'DAYCARE' 
                                ? `Gửi: ${booking.dropOffTime?.substring(0, 5)} - Đón: ${booking.pickUpTime?.substring(0, 5)}`
                                : `Nhận: ${booking.dropOffTime?.substring(0, 5) || '14:00'} | Trả: ${booking.pickUpTime?.substring(0, 5) || '12:00'}`}
                            </span>
                          </div>
                        </td>
 
                        {/* Cost */}
                        <td className="px-4 py-4 whitespace-nowrap font-black text-[#a43e24]">
                          {booking.totalAmount.toLocaleString('vi-VN')} đ
                        </td>
 
                        {/* Status Badge */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 w-fit ${cfg.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
 
                        {/* Operational Actions */}
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {booking.status === 'PENDING' && (
                            <button 
                              onClick={() => handleConfirm(booking.id)} 
                              style={orangeGradient}
                              className="text-white font-black text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-[#fa7150]/10 cursor-pointer"
                            >
                              Xác Nhận Đơn
                            </button>
                          )}
                          {booking.status === 'CONFIRMED' && (
                            <button 
                              onClick={() => handleCheckIn(booking.id)} 
                              className="bg-[#44683b] hover:bg-[#44683b]/95 text-white font-black text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-[#44683b]/10 cursor-pointer"
                            >
                              Tiếp Nhận Bé (Check-in)
                            </button>
                          )}
                          {booking.status === 'CHECKED_IN' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => {
                                  setDiaryBookingId(booking.id)
                                  setDiaryTitle('Cập nhật nhật ký chăm sóc')
                                  setDiaryContent('')
                                  setDiaryEating('')
                                  setDiaryMood('')
                                  setDiaryActivity('')
                                  setDiaryImageUrl('')
                                  setShowDiaryModal(true)
                                }} 
                                className="bg-amber-500 hover:bg-amber-500/95 text-white font-black text-[9px] uppercase tracking-wider px-3 py-2 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
                              >
                                Cập Nhật Nhật Ký
                              </button>
                              <button 
                                onClick={() => handleCheckOut(booking.id)} 
                                className="bg-purple-600 hover:bg-purple-600/95 text-white font-black text-[9px] uppercase tracking-wider px-3 py-2 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-purple-600/10 cursor-pointer"
                              >
                                Hoàn Thành (Check-out)
                              </button>
                            </div>
                          )}
                          {booking.status === 'COMPLETED' && (
                            <span className="text-[#44683b] font-black text-[10px] uppercase tracking-wider flex items-center gap-1 justify-end">
                              <CheckCircle size={14} /> Hoàn Thành tốt
                            </span>
                          )}
                          {booking.status === 'CANCELLED' && (
                            <span className="text-rose-500 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 justify-end">
                              <XCircle size={14} /> Đơn Đã Hủy
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* ── DIARY UPDATE MODAL (Mạng xã hội Composer) ── */}
        {showDiaryModal && (
          <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-xl w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200 text-left">
              
              {/* Header */}
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-[#e5d8d0]/60">
                <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                  <Camera size={18} className="text-[#fa7150]" />
                  Tạo khoảnh khắc nhật ký cho bé
                </h3>
                <button 
                  onClick={() => setShowDiaryModal(false)}
                  className="w-8 h-8 rounded-full bg-[#faf9f6] border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-rose-500 hover:border-rose-200 transition-all cursor-pointer"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Author / Staff Information */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#fa7150] flex items-center justify-center text-white font-black text-sm uppercase">
                  {user?.fullName?.charAt(0) || 'B'}
                </div>
                <div>
                  <h4 className="font-black text-[#303330] text-sm">{user?.fullName || 'Bảo mẫu chăm sóc'}</h4>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Đang hoạt động</span>
                </div>
              </div>

              <form onSubmit={handleSaveDiary} className="space-y-4 text-xs font-bold">
                {/* Main Content Area (Textarea like status) */}
                <div>
                  <textarea
                    rows={4}
                    value={diaryContent}
                    onChange={e => setDiaryContent(e.target.value)}
                    placeholder="Hôm nay bé thế nào? Hãy chia sẻ bữa ăn, giấc ngủ hoặc những trò đùa tinh nghịch của bé cưng tại đây..."
                    className="w-full p-4 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl outline-none font-normal text-sm text-[#303330] focus:border-[#fa7150] transition-colors resize-none placeholder:text-[#8a7e75]/60"
                  />
                </div>

                {/* Photo Upload Row (Social Style) */}
                <div className="bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[#303330] text-xs font-black">
                      Hình ảnh hoạt động thực tế
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center justify-center border border-[#e5d8d0] hover:border-[#fa7150] rounded-xl px-4 py-2 cursor-pointer bg-white transition-colors">
                      <span className="text-xs font-black text-[#5a5550]">Chọn ảnh và tải lên</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadLoading(true)
                          try {
                            const formData = new FormData()
                            formData.append('file', file)
                            const res = await axiosInstance.post('/api/upload/image', formData, {
                              headers: { 'Content-Type': 'multipart/form-data' }
                            })
                            setDiaryImageUrl(res.data.url)
                          } catch (err) {
                            alert('Không thể tải tệp lên: Vui lòng kiểm tra kết nối Cloudinary.')
                          } finally {
                            setUploadLoading(false)
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    
                    {uploadLoading && (
                      <span className="text-[10px] text-[#8a7e75] font-bold animate-pulse">
                        Đang tải ảnh lên Cloudinary...
                      </span>
                    )}
                  </div>
                  
                  {/* Photo Preview */}
                  {diaryImageUrl && (
                    <div className="mt-3 relative w-full h-40 rounded-xl overflow-hidden border border-[#e5d8d0] bg-white group">
                      <img src={diaryImageUrl} alt="Preview pet activity" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                {/* Status Parameters Group (Eating, Mood, Activity as Free-text inputs) */}
                <div className="grid grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[9px] text-[#8a7e75] mb-1 uppercase tracking-wider">Khẩu phần ăn</label>
                    <input
                      type="text"
                      value={diaryEating}
                      onChange={e => setDiaryEating(e.target.value)}
                      placeholder="Ví dụ: Ăn ngon, ăn ít..."
                      className="w-full p-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl outline-none text-[#303330] text-[11px] font-bold focus:border-[#fa7150] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-[#8a7e75] mb-1 uppercase tracking-wider">Tâm trạng</label>
                    <input
                      type="text"
                      value={diaryMood}
                      onChange={e => setDiaryMood(e.target.value)}
                      placeholder="Ví dụ: Vui vẻ, nhút nhát..."
                      className="w-full p-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl outline-none text-[#303330] text-[11px] font-bold focus:border-[#fa7150] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-[#8a7e75] mb-1 uppercase tracking-wider">Hoạt động</label>
                    <input
                      type="text"
                      value={diaryActivity}
                      onChange={e => setDiaryActivity(e.target.value)}
                      placeholder="Ví dụ: Chạy nhảy, ngủ ngoan..."
                      className="w-full p-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-xl outline-none text-[#303330] text-[11px] font-bold focus:border-[#fa7150] transition-colors"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 justify-end pt-3 border-t border-[#e5d8d0]/60">
                  <button
                    type="button"
                    onClick={() => setShowDiaryModal(false)}
                    className="px-6 py-2.5 bg-[#faf9f6] border border-[#e5d8d0] rounded-full hover:bg-[#faf9f6]/80 text-[#5a5550] cursor-pointer font-bold text-xs"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-[#fa7150] hover:bg-[#fa7150]/90 text-white rounded-full cursor-pointer shadow-lg shadow-[#fa7150]/20 font-black text-xs"
                  >
                    Đăng Nhật Ký
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }
