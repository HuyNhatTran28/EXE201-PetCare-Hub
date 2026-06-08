import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import {
  CheckCircle, XCircle,
  ArrowRight, PawPrint, MapPin, Clock, Star
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface Booking {
  id: string
  invoiceNumber: string
  hotelId: string
  hotelName: string
  hotelAddress: string
  roomTypeName: string
  checkInDate: string
  checkOutDate: string
  totalNights: number
  totalAmount: number
  status: string
  pets: { id: string; name: string; species: string }[]
  createdAt: string
  paymentMethod?: string
  isReviewed?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  PENDING:    { label: 'Chờ thanh toán', bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500'  },
  CONFIRMED:  { label: 'Đã xác nhận',   bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500'   },
  CHECKED_IN: { label: 'Đang lưu trú',  bg: 'bg-purple-50',  text: 'text-purple-700', dot: 'bg-purple-500' },
  COMPLETED:  { label: 'Hoàn tất',      bg: 'bg-emerald-50', text: 'text-emerald-700',dot: 'bg-emerald-500'},
  CANCELLED:  { label: 'Đã hủy',        bg: 'bg-rose-50',    text: 'text-rose-700',   dot: 'bg-rose-500'   },
}

const TABS = ['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED']

export const MyBookingsPage = () => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null)
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<Booking | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axiosInstance.get('/api/bookings/my', {
          params: { page: 0, size: 50, sort: [] }
        })
        console.log('Bookings response:', res.data) // ← thêm log
        const list = (res.data.content || []).map((b: any) => ({
          ...b,
          paymentMethod: b.paymentMethod || 'VIETQR'
        }))
        setBookings(list)
      } catch (err: any) {
        console.error('Error:', err.response?.status, err.response?.data)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Bạn có chắc muốn hủy booking này?')) return
    setCancelling(bookingId)
    try {
      await axiosInstance.patch(`/api/bookings/${bookingId}/cancel`)
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
      ))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể hủy booking này')
    } finally {
      setCancelling(null)
    }
  }

  const handlePayNow = async (booking: Booking) => {
    try {
      const res = await axiosInstance.post('/api/payment/create-payment-link', {
        bookingId: booking.id
      })
      if (res.data && res.data.checkoutUrl) {
        window.location.href = res.data.checkoutUrl
      } else {
        alert('Không thể tạo liên kết thanh toán.')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi kết nối đến cổng thanh toán.')
    }
  }

  const filtered = activeTab === 'ALL'
    ? bookings
    : bookings.filter(b => b.status === activeTab)

  const cardShadow = { boxShadow: '0 4px 20px rgba(48,51,48,0.06)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans pb-24">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <header className="mb-10 text-left">
          <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">
            Tài khoản của tôi
          </span>
          <h1 className="text-4xl font-black tracking-tight mt-1 mb-2">
            Lịch sử đặt phòng
          </h1>
          <p className="text-[#8a7e75] text-sm">
            Theo dõi tất cả các chuyến nghỉ dưỡng của thú cưng.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {TABS.map(tab => {
            const cfg = STATUS_CONFIG[tab]
            const count = tab === 'ALL'
              ? bookings.length
              : bookings.filter(b => b.status === tab).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  activeTab === tab
                    ? 'bg-[#a43e24] text-white border-[#a43e24]'
                    : 'bg-white border-[#e5d8d0] text-[#8a7e75] hover:border-[#a43e24]'
                }`}
              >
                {tab === 'ALL' ? 'Tất cả' : cfg?.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center">
            <span className="w-8 h-8 rounded-full border-4 border-[#a43e24]/20 border-t-[#a43e24] animate-spin inline-block" />
            <p className="text-[#8a7e75] font-bold mt-4">Đang tải lịch sử...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl">
            <PawPrint size={40} className="text-[#e5d8d0] mx-auto mb-4" />
            <p className="text-[#8a7e75] font-bold">Chưa có booking nào.</p>
            <button
              onClick={() => navigate('/hotels')}
              className="mt-4 px-6 py-2.5 rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: '#a43e24' }}
            >
              Tìm khách sạn ngay
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(booking => {
              const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.CANCELLED
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl border border-[#e5d8d0] p-6 text-left"
                  style={cardShadow}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-1">
                        #{booking.invoiceNumber}
                      </p>
                      <h3 className="text-lg font-black text-[#303330]">
                        {booking.hotelName}
                      </h3>
                      <p className="text-xs text-[#8a7e75] flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-[#a43e24]" />
                        {booking.hotelAddress}
                      </p>
                    </div>
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase border ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-4 gap-4 mb-4 bg-[#faf9f6] p-4 rounded-2xl">
                    <div>
                      <p className="text-[10px] text-[#8a7e75] font-bold uppercase mb-1">Loại phòng</p>
                      <p className="text-xs font-black text-[#303330]">{booking.roomTypeName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8a7e75] font-bold uppercase mb-1">Ngày lưu trú</p>
                      <p className="text-xs font-black text-[#303330] flex items-center gap-1">
                        {booking.checkInDate}
                        <ArrowRight size={10} className="text-[#a43e24]" />
                        {booking.checkOutDate}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8a7e75] font-bold uppercase mb-1">Thanh toán</p>
                      <p className="text-xs font-black text-[#303330] flex items-center gap-1">
                        {booking.paymentMethod === 'MOMO'   ? 'MoMo'
                        : booking.paymentMethod === 'VNPAY' ? 'VNPay'
                        :                                     'VietQR'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8a7e75] font-bold uppercase mb-1">Tổng tiền</p>
                      <p className="text-xs font-black text-[#a43e24]">
                        {(booking.totalAmount || 0).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>

                  {/* Pets */}
                  {booking.pets?.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <PawPrint size={13} className="text-[#a43e24]" />
                      <span className="text-xs text-[#8a7e75] font-bold">Thú cưng:</span>
                      {booking.pets.map(p => (
                        <span key={p.id} className="text-xs bg-[#feeadb] text-[#a43e24] px-2 py-0.5 rounded-full font-bold">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-[#e5d8d0]">
                    {booking.status === 'CHECKED_IN' && (
                      <button
                        onClick={() => navigate(`/diary/${booking.id}`)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                        style={{ backgroundColor: '#a43e24' }}
                      >
                        Xem nhật ký lưu trú
                      </button>
                    )}
                    {booking.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => setPayingBooking(booking)}
                          className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1"
                          style={{ backgroundColor: '#a43e24' }}
                        >
                          Thanh toán ngay
                        </button>
                        <button
                          onClick={() => handleCancel(booking.id)}
                          disabled={cancelling === booking.id}
                          className="py-2.5 px-4 rounded-xl text-xs font-bold border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
                        >
                          Hủy
                        </button>
                      </>
                    )}
                    {booking.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelling === booking.id}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-rose-200 text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        {cancelling === booking.id ? 'Đang hủy...' : 'Hủy booking'}
                      </button>
                    )}
                    {booking.status === 'COMPLETED' && (
                      <div className="flex items-center gap-3 w-full justify-between">
                        <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                          <CheckCircle size={14} /> Đã hoàn thành
                        </div>
                        {booking.isReviewed ? (
                          <span className="text-xs text-[#8a7e75] italic font-bold">Đã đánh giá</span>
                        ) : (
                          <button
                            onClick={() => setSelectedReviewBooking(booking)}
                            className="bg-[#2c4e24] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
                          >
                            <Star size={12} fill="currentColor" /> Viết đánh giá
                          </button>
                        )}
                      </div>
                    )}
                    {booking.status === 'CANCELLED' && (
                      <div className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                        <XCircle size={14} /> Đã hủy
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      {payingBooking && (
        <PaymentModal
          booking={payingBooking}
          onClose={() => setPayingBooking(null)}
          onConfirmed={(bookingId) => {
            setBookings(prev => prev.map(b =>
              b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b
            ))
            setPayingBooking(null)
          }}
        />
      )}

      {selectedReviewBooking && (
        <ReviewModal
          booking={selectedReviewBooking}
          onClose={() => setSelectedReviewBooking(null)}
          onReviewed={(bookingId) => {
            setBookings(prev => prev.map(b =>
              b.id === bookingId ? { ...b, isReviewed: true } : b
            ))
            setSelectedReviewBooking(null)
          }}
        />
      )}
    </div>
  )
}

const ReviewModal = ({ booking, onClose, onReviewed }: {
  booking: Booking
  onClose: () => void
  onReviewed: (bookingId: string) => void
}) => {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) {
      alert('Vui lòng nhập bình luận!')
      return
    }
    setSubmitting(true)
    try {
      await axiosInstance.post('/api/reviews', {
        bookingId: booking.id,
        starRating: rating,
        comment: comment,
        photoUrls: []
      })
      alert('Cảm ơn bạn đã gửi đánh giá!')
      onReviewed(booking.id)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Có lỗi xảy ra khi gửi đánh giá.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-left border border-[#e5d8d0]">
        <h3 className="text-lg font-black text-[#303330] mb-1">Đánh giá dịch vụ</h3>
        <p className="text-[11px] text-[#8a7e75] mb-4">Đơn hàng: #{booking.invoiceNumber} - Khách sạn: {booking.hotelName}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-[#8a7e75] uppercase mb-1.5">Số sao đánh giá</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-all focus:outline-none"
                >
                  <Star 
                    size={22} 
                    className={star <= rating ? 'text-[#f59e0b]' : 'text-stone-200'} 
                    fill={star <= rating ? 'currentColor' : 'none'} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#8a7e75] uppercase mb-1.5">Bình luận & Ý kiến đóng góp</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bé cưng của bạn đã có trải nghiệm như thế nào?..."
              rows={4}
              className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none resize-none focus:border-[#fa7150]"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-xs font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-[#a43e24] hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const PaymentModal = ({ booking, onClose, onConfirmed }: {
  booking: Booking
  onClose: () => void
  onConfirmed: (id: string) => void
}) => {
  const [polling, setPolling] = useState(true)
  const [countdown, setCountdown] = useState(900) // 15 phút
  const [payosData, setPayosData] = useState<any>(null)
  const [loadingPayos, setLoadingPayos] = useState(true)

  // Fetch payOS link
  useEffect(() => {
    const initPayment = async () => {
      try {
        const res = await axiosInstance.post('/api/payment/create-payment-link', {
          bookingId: booking.id
        })
        if (res.data) {
          setPayosData(res.data)
        }
      } catch (err) {
        console.error('Error creating payment link', err)
      } finally {
        setLoadingPayos(false)
      }
    }
    initPayment()
  }, [booking.id])

  // Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Polling mỗi 5 giây
  useEffect(() => {
    if (!polling) return
    const interval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/api/bookings/${booking.id}`)
        if (res.data.status === 'CONFIRMED') {
          setPolling(false)
          clearInterval(interval)
          onConfirmed(booking.id)
          alert('Thanh toán thành công! Email xác nhận đã được gửi.')
        }
      } catch (err) {
        console.error('Polling error', err)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [polling])

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center relative text-left">
        <h3 className="text-lg font-black text-[#303330] mb-1 text-center">Thanh toán đơn đặt phòng</h3>
        <p className="text-xs text-[#8a7e75] mb-2 text-center">#{booking.invoiceNumber}</p>
        <p className="text-2xl font-black text-[#a43e24] mb-4 text-center">
          {(booking.totalAmount || 0).toLocaleString('vi-VN')}đ
        </p>

        {/* Countdown */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-4 flex items-center justify-center gap-2">
          <Clock size={14} className="text-amber-600" />
          <span className="text-xs font-black text-amber-700">
            Hết hạn sau: {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>

        {/* QR */}
        <div className="bg-[#faf9f6] rounded-2xl p-4 mb-4 border border-[#e5d8d0] text-center min-h-[220px] flex flex-col items-center justify-center">
          {loadingPayos ? (
            <>
              <span className="w-8 h-8 rounded-full border-4 border-[#a43e24]/20 border-t-[#a43e24] animate-spin inline-block mb-3" />
              <p className="text-[10px] text-[#8a7e75] font-bold">Đang tạo mã QR payOS...</p>
            </>
          ) : payosData ? (
            <>
              <img
                src={`https://img.vietqr.io/image/${payosData.bin}-${payosData.accountNumber}-compact2.png?amount=${payosData.amount}&addInfo=${payosData.description}&accountName=${encodeURIComponent(payosData.accountName)}`}
                alt="QR thanh toán"
                className="w-48 h-48 mx-auto rounded-xl shadow-sm border border-stone-200"
              />
              <p className="text-[10px] text-[#8a7e75] mt-2 font-bold">
                Tài khoản: {payosData.accountNumber} - {payosData.accountName}
              </p>
              <a 
                href={payosData.checkoutUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-3 text-xs text-[#a43e24] hover:underline font-black block"
              >
                Mở link thanh toán payOS ↗
              </a>
            </>
          ) : (
            <p className="text-xs text-rose-500 font-bold py-6">Không thể khởi tạo cổng thanh toán payOS</p>
          )}
        </div>

        {/* Nội dung CK */}
        {payosData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
            <p className="text-xs font-bold text-amber-700">Nội dung chuyển khoản:</p>
            <p className="text-xs font-black text-[#303330] mt-1">{payosData.description}</p>
          </div>
        )}

        {/* Polling status */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#a43e24] animate-pulse" />
          <p className="text-[10px] text-[#8a7e75]">
            Đang chờ xác nhận thanh toán...
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6] text-center"
        >
          Đóng — thanh toán sau
        </button>
      </div>
    </div>
  )
}
