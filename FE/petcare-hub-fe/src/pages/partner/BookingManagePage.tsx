import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Compass,
  AlertCircle,
  HelpCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

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
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const hotelId = '9472cf9d-d27b-42dc-8361-f1e10b2a1084' // Default Nemo Pet Resort

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get(`/api/bookings/hotel/${hotelId}`)
      const list = (response.data.content || []).map((b: any) => ({
        id: b.id,
        invoiceNumber: b.invoiceNumber,
        ownerName: b.owner?.fullName || 'Khách hàng',
        roomTypeName: b.roomType?.name || 'Phòng nghỉ dưỡng',
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        totalAmount: b.totalAmount,
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
    fetchBookings()
  }, [])

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Chờ Thanh Toán</span>
      case 'CONFIRMED': return <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Đã Xác Nhận</span>
      case 'CHECKED_IN': return <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Đang Lưu Trú</span>
      case 'COMPLETED': return <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Đã Hoàn Tất</span>
      default: return <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Đã Hủy</span>
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans text-left">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20">
        <div className="flex items-center gap-4">
          <Link to="/partner/dashboard" className="text-[#8a7e75] hover:text-[#fa7150] transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <span className="text-xl font-bold tracking-tight">Duyệt Đặt Phòng (Bookings)</span>
        </div>
        <button onClick={fetchBookings} className="p-2.5 rounded-full bg-white border border-[#e5d8d0] text-[#8a7e75] hover:text-[#fa7150] transition-colors cursor-pointer">
          <RefreshCw size={18} />
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <div className="mb-12">
          <h1 className="text-3xl font-black text-[#303330]">Danh Sách Đơn Đặt Phòng</h1>
          <p className="text-[#5a5550] text-sm mt-1">Duyệt thông tin, xác nhận thanh toán thành công, thực hiện tiếp nhận thú cưng check-in và hoàn tất checkout.</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#8a7e75] font-bold text-sm">Đang tải danh sách đặt phòng...</div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-white">
            <p className="text-[#8a7e75] font-bold text-sm">Chưa có đơn đặt phòng nào phát sinh tại cơ sở này.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#e5d8d0] rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#fdfaf8] border-b border-[#e5d8d0]/60 text-xs font-black uppercase text-[#8a7e75] tracking-wider text-left">
                  <th className="p-5">Mã Invoice</th>
                  <th className="p-5">Chủ Nuôi</th>
                  <th className="p-5">Loại Phòng</th>
                  <th className="p-5">Thời Gian Gửi</th>
                  <th className="p-5">Tổng Tiền</th>
                  <th className="p-5">Trạng Thái</th>
                  <th className="p-5 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5d8d0]/60 text-xs">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-5 font-mono font-bold text-[#fa7150]">{booking.invoiceNumber}</td>
                    <td className="p-5 font-bold text-[#303330]">{booking.ownerName}</td>
                    <td className="p-5 text-[#5a5550]">{booking.roomTypeName}</td>
                    <td className="p-5 text-[#5a5550]">{booking.checkInDate} $\rightarrow$ {booking.checkOutDate}</td>
                    <td className="p-5 font-bold text-[#a43e24]">{booking.totalAmount.toLocaleString('vi-VN')} đ</td>
                    <td className="p-5">{getStatusBadge(booking.status)}</td>
                    <td className="p-5 text-right">
                      {booking.status === 'PENDING' && (
                        <button onClick={() => handleConfirm(booking.id)} className="bg-[#fa7150] hover:bg-[#fa7150]/90 text-white font-bold px-4 py-2 rounded-xl cursor-pointer">Xác Nhận</button>
                      )}
                      {booking.status === 'CONFIRMED' && (
                        <button onClick={() => handleCheckIn(booking.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer">Check In</button>
                      )}
                      {booking.status === 'CHECKED_IN' && (
                        <button onClick={() => handleCheckOut(booking.id)} className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-xl cursor-pointer">Check Out</button>
                      )}
                      {booking.status === 'COMPLETED' && (
                        <span className="text-green-600 font-bold">Hoàn Thành (✓)</span>
                      )}
                      {booking.status === 'CANCELLED' && (
                        <span className="text-red-500 font-bold">Đã Hủy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

    </div>
  )
}
