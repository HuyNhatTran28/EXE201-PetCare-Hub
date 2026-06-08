import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Calendar, ArrowRight, Home, CreditCard } from 'lucide-react'
import { Header } from '@/components/Header'
import axiosInstance from '@/lib/axios'

interface BookingInfo {
  id: string
  invoiceNumber: string
  hotelName: string
  totalAmount: number
}

export const PaymentResultPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const status = searchParams.get('status')
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    const fetchBookingDetails = async () => {
      try {
        if (status === 'success') {
          try {
            await axiosInstance.get(`/api/payment/verify/${bookingId}`)
          } catch (vErr) {
            console.error('Lỗi khi đối soát thanh toán:', vErr)
          }
        }
        const res = await axiosInstance.get(`/api/bookings/${bookingId}`)
        if (res.data) {
          setBooking({
            id: res.data.id,
            invoiceNumber: res.data.invoiceNumber || 'N/A',
            hotelName: res.data.hotelName || 'Khách sạn thú cưng',
            totalAmount: res.data.totalAmount || 0,
          })
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin đơn đặt phòng:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBookingDetails()
  }, [bookingId, status])

  const isSuccess = status === 'success'

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans flex flex-col">
      <Header />

      <main className="flex-1 max-w-xl w-full mx-auto px-6 py-16 flex flex-col justify-center">
        {loading ? (
          <div className="text-center py-12">
            <span className="w-10 h-10 rounded-full border-4 border-[#a43e24]/20 border-t-[#a43e24] animate-spin inline-block" />
            <p className="text-[#8a7e75] font-bold mt-4">Đang xác thực giao dịch...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 sm:p-10 text-center shadow-xl animate-in fade-in zoom-in duration-300">
            {isSuccess ? (
              <>
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce">
                  <CheckCircle size={40} />
                </div>
                <h1 className="text-3xl font-black text-[#303330] mb-2 tracking-tight">Thanh toán thành công!</h1>
                <p className="text-sm text-[#8a7e75] mb-8 max-w-sm mx-auto">
                  Cảm ơn bạn đã lựa chọn PetCare Hub. Giao dịch thanh toán của bạn đã được xác nhận thành công.
                </p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <XCircle size={40} />
                </div>
                <h1 className="text-3xl font-black text-[#303330] mb-2 tracking-tight">Thanh toán thất bại</h1>
                <p className="text-sm text-[#8a7e75] mb-8 max-w-sm mx-auto">
                  Giao dịch thanh toán đã bị hủy hoặc chưa hoàn thành. Bạn có thể thử lại bất cứ lúc nào trong Lịch sử đặt phòng.
                </p>
              </>
            )}

            {booking && (
              <div className="bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl p-5 mb-8 text-left space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8a7e75] font-bold uppercase">Mã hóa đơn</span>
                  <span className="font-black text-[#303330] bg-white border border-[#e5d8d0] px-2.5 py-1 rounded-lg">
                    {booking.invoiceNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8a7e75] font-bold uppercase">Khách sạn</span>
                  <span className="font-black text-[#303330] text-right max-w-[180px] truncate">
                    {booking.hotelName}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-[#e5d8d0]/60 text-xs">
                  <span className="text-[#8a7e75] font-bold uppercase">Tổng thanh toán</span>
                  <span className="text-base font-black text-[#a43e24]">
                    {booking.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/my-bookings')}
                className="w-full bg-[#a43e24] hover:bg-[#8f351e] text-white py-4 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#a43e24]/10 cursor-pointer"
              >
                Xem lịch sử đặt phòng <ArrowRight size={14} />
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-white hover:bg-stone-50 text-[#8a7e75] border border-[#e5d8d0] py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home size={14} /> Quay lại Trang chủ
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
