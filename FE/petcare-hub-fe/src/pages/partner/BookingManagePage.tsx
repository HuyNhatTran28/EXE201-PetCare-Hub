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
  ArrowRight
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
}

export const BookingManagePage = () => {
  const { user } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  
  const [hotelId, setHotelId] = useState<string | null>(null)

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
        status: b.status
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
          params: { page: 0, size: 1, sort: [] }
        })
        const hotels = res.data.content || []
        if (hotels.length > 0) {
          setHotelId(hotels[0].id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to fetch hotel', err)
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
    } catch (error) {
      alert('Không thể xác nhận: Vui lòng kiểm tra trạng thái thanh toán.')
    }
  }

  const handleCheckIn = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/bookings/${id}/checkin?checkinPhotoUrl=https://example.com/in.jpg&ownerSignatureUrl=https://example.com/sig.png`)
      fetchBookings()
    } catch (error) {
      alert('Không thể check-in: Đơn hàng cần ở trạng thái CONFIRMED.')
    }
  }

  const handleCheckOut = async (id: string) => {
    try {
      await axiosInstance.patch(`/api/bookings/${id}/checkout`)
      fetchBookings()
    } catch (error) {
      alert('Không thể check-out: Thú cưng chưa ở trạng thái CHECKED_IN.')
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
        <div className="p-8 md:p-12 overflow-y-auto flex-grow max-w-7xl w-full mx-auto">
          
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
          <div className="bg-white border border-[#e5d8d0] rounded-3xl p-6 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between" style={cardShadow}>
            {/* Search Input */}
            <div className="relative w-full md:w-96">
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
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'].map((st) => {
                const label = st === 'ALL' ? 'Tất Cả' : getStatusConfig(st).label;
                const isSelected = filterStatus === st;
                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
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
            <div className="bg-white border border-[#e5d8d0] rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.01)] text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#fdfaf8] border-b border-[#e5d8d0]/60 text-[10px] font-black uppercase text-[#8a7e75] tracking-wider text-left">
                    <th className="p-6">Mã Đơn Đặt</th>
                    <th className="p-6">Chủ Thú Cưng</th>
                    <th className="p-6">Hạng Phòng</th>
                    <th className="p-6">Thời Gian Lưu Trú</th>
                    <th className="p-6">Chi Phí</th>
                    <th className="p-6">Trạng Thái</th>
                    <th className="p-6 text-right">Vận Hành</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5d8d0]/60 text-xs font-semibold">
                  {filteredBookings.map((booking) => {
                    const cfg = getStatusConfig(booking.status);
                    return (
                      <tr key={booking.id} className="hover:bg-[#faf9f6]/40 transition-colors">
                        {/* Invoice Number */}
                        <td className="p-6 font-mono font-black text-[#fa7150]">#{booking.invoiceNumber}</td>
                        
                        {/* Customer Name */}
                        <td className="p-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#fa7150]/10 border border-[#fa7150]/20 flex items-center justify-center text-xs font-black text-[#fa7150]">
                              {booking.ownerName.charAt(0)}
                            </div>
                            <span className="font-bold text-[#303330]">{booking.ownerName}</span>
                          </div>
                        </td>

                        {/* Room Type */}
                        <td className="p-6 text-[#5a5550]">{booking.roomTypeName}</td>

                        {/* Dates */}
                        <td className="p-6">
                          <div className="flex items-center gap-2 text-[#5a5550]">
                            <span className="font-bold text-[#303330]">{booking.checkInDate}</span>
                            <ArrowRight size={12} className="text-[#fa7150]" />
                            <span className="font-bold text-[#303330]">{booking.checkOutDate}</span>
                          </div>
                        </td>

                        {/* Cost */}
                        <td className="p-6 font-black text-[#a43e24]">
                          {booking.totalAmount.toLocaleString('vi-VN')} đ
                        </td>

                        {/* Status Badge */}
                        <td className="p-6">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 w-fit ${cfg.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>

                        {/* Operational Actions */}
                        <td className="p-6 text-right">
                          {booking.status === 'PENDING' && (
                            <button 
                              onClick={() => handleConfirm(booking.id)} 
                              style={orangeGradient}
                              className="text-white font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-[#fa7150]/10 cursor-pointer"
                            >
                              Xác Nhận Đơn
                            </button>
                          )}
                          {booking.status === 'CONFIRMED' && (
                            <button 
                              onClick={() => handleCheckIn(booking.id)} 
                              className="bg-[#44683b] hover:bg-[#44683b]/95 text-white font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-[#44683b]/10 cursor-pointer"
                            >
                              Tiếp Nhận Bé (Check-in)
                            </button>
                          )}
                          {booking.status === 'CHECKED_IN' && (
                            <button 
                              onClick={() => handleCheckOut(booking.id)} 
                              className="bg-purple-600 hover:bg-purple-600/95 text-white font-black text-[10px] uppercase tracking-wider px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md shadow-purple-600/10 cursor-pointer"
                            >
                              Hoàn Thành (Check-out)
                            </button>
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
      </div>
    )
  }
