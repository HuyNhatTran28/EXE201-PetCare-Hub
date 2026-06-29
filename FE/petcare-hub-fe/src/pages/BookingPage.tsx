import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  ArrowRight,
  QrCode,
  PlusCircle,
  Building,
  ShieldCheck,
} from 'lucide-react'

import { Header } from '@/components/Header'

const USER_PETS = [
  { id: '1', name: 'Mimi', breed: 'Mèo Anh Lông Ngắn', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200' },
  { id: '2', name: 'Bông', breed: 'Chó Samoyed', image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200' },
]

export const BookingPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const nights = Number(searchParams.get('nights')) || 1
  const initialTotal = Number(searchParams.get('total')) || 0
  const roomPrice = Number(searchParams.get('price')) || 350000

  const [isSuccess, setIsSuccess] = useState(false)
  const [selectedPetId, setSelectedPetId] = useState('1')
  const [paymentMethod, setPaymentMethod] = useState<'MOMO' | 'VNPAY'>('MOMO')

  useEffect(() => {
    if (isSuccess) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isSuccess])

  const handleCompleteBooking = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSuccess(true)
  }

  const roomName = searchParams.get('roomName') || 'Phòng đã chọn'

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#fa7150] selection:text-white pb-24">

      {/* ── HEADER ── */}
      <Header />

      {/* MODAL THÀNH CÔNG (Sau khi click hoàn tất) */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-[#d0fac0] text-[#2c4e24] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-[#303330] mb-2">Đặt phòng thành công!</h3>
            <p className="text-xs text-[#5a5550] leading-relaxed mb-6">
              Đơn hàng của bạn đã được tiếp nhận. Đội ngũ nhân viên bảo mẫu của PetCare Hub sẽ liên hệ với bạn trong vòng 10 phút để xác nhận thủ tục nhận bé cưng.
            </p>

            {/* Ảnh QR MoMo / VietQR ảo nếu thanh toán qua Ví */}
            {['MOMO', 'VIETQR'].includes(paymentMethod) && (
              <div className="bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl p-4 mb-6 flex flex-col items-center">
                <QrCode size={140} className="text-[#303330] mb-3" />
                <p className="text-[10px] font-black text-[#fa7150] uppercase tracking-wider">Quét QR MoMo để thanh toán</p>
                <p className="text-[9px] text-[#8a7e75] mt-0.5">Số tiền: {initialTotal.toLocaleString('vi-VN')} đ</p>
              </div>
            )}

            <button
              onClick={() => navigate('/my-bookings')}
              className="w-full bg-[#fa7150] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#fa7150]/90 transition-all cursor-pointer"
            >
              Xem nhật ký hoạt động <ArrowRight size={14} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* ── TIẾN TRÌNH ĐẶT PHÒNG ── */}
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Stepper chỉ số */}
        <div className="flex justify-center mb-16">
          <div className="flex items-center w-full max-w-2xl justify-between">

            {/* Step 1 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#44683b] text-white flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#44683b]">Ngày gửi</span>
            </div>

            <div className="flex-grow h-[2px] bg-[#44683b] mx-4 -mt-6" />

            {/* Step 2 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#44683b] text-white flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#44683b]">Chọn phòng</span>
            </div>

            <div className="flex-grow h-[2px] bg-[#44683b] mx-4 -mt-6" />

            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#fa7150] text-white flex items-center justify-center font-bold text-sm ring-4 ring-[#fa7150]/20">
                3
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#fa7150]">Chọn Bé</span>
            </div>

            <div className="flex-grow h-[2px] bg-[#e5d8d0] mx-4 -mt-6" />

            {/* Step 4 */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#e5d8d0] text-[#8a7e75] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider text-[#8a7e75]">Thanh toán</span>
            </div>

          </div>
        </div>

        {/* Nội dung 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">

          {/* CỘT CHỌN THÚ CƯNG & THANH TOÁN (Bên Trái) */}
          <div className="lg:col-span-7 space-y-12">

            {/* Chọn Thú Cưng Lưu Trú */}
            <section>
              <h2 className="text-2xl font-black mb-6 text-[#303330]">
                Thú cưng nào sẽ lưu trú cùng chúng tôi?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {USER_PETS.map((pet) => {
                  const isSelected = selectedPetId === pet.id
                  return (
                    <div
                      key={pet.id}
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`relative p-5 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${isSelected
                          ? 'border-[#fa7150] bg-[#fdfcfb] shadow-lg shadow-[#fa7150]/2'
                          : 'border-[#e5d8d0] hover:bg-white'
                        }`}
                    >
                      <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                        <img
                          src={pet.image}
                          alt={pet.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#303330]">{pet.name}</h3>
                        <p className="text-xs text-[#8a7e75]">{pet.breed}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-4 right-4 text-[#fa7150]">
                          <CheckCircle size={16} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Thêm mới thú cưng ảo */}
                <button
                  onClick={() => navigate('/pets')}
                  className="flex items-center justify-center gap-3 border-2 border-dashed border-[#e5d8d0] rounded-2xl p-5 text-[#fa7150] hover:border-[#fa7150] hover:bg-[#fa7150]/5 transition-all cursor-pointer"
                >
                  <PlusCircle size={18} />
                  <span className="font-bold text-xs uppercase tracking-wider">Thêm bé mới</span>
                </button>
              </div>
            </section>

            {/* Chọn Phương thức thanh toán */}
            <section>
              <h2 className="text-2xl font-black mb-6 text-[#303330]">Phương thức thanh toán</h2>
              <div className="space-y-4">

                {/* MoMo */}
                <label
                  onClick={() => setPaymentMethod('MOMO')}
                  className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border transition-all ${paymentMethod === 'MOMO' ? 'bg-[#fdfcfb] border-[#fa7150]' : 'border-[#e5d8d0] hover:border-[#fa7150]/50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#fff0e6] flex items-center justify-center text-[#fa7150] font-black text-sm">
                      M
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#303330]">Ví điện tử MoMo</h4>
                      <p className="text-xs text-[#8a7e75]">Quét mã QR MoMo và thanh toán tự động trong 5 giây.</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'MOMO'}
                    onChange={() => { }}
                    className="w-4.5 h-4.5 text-[#fa7150] focus:ring-[#fa7150] border-[#e5d8d0]"
                  />
                </label>

                {/* VNPay */}
                <label
                  onClick={() => setPaymentMethod('VNPAY')}
                  className={`flex items-center justify-between p-5 rounded-2xl cursor-pointer border transition-all ${paymentMethod === 'VNPAY' ? 'bg-[#fdfcfb] border-[#fa7150]' : 'border-[#e5d8d0] hover:border-[#fa7150]/50'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#fff0e6] flex items-center justify-center text-[#fa7150]">
                      <Building size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#303330]">Thẻ ATM nội địa / VNPay QR</h4>
                      <p className="text-xs text-[#8a7e75]">Thanh toán qua cổng ngân hàng nội địa an toàn SSL.</p>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'VNPAY'}
                    onChange={() => { }}
                    className="w-4.5 h-4.5 text-[#fa7150] focus:ring-[#fa7150] border-[#e5d8d0]"
                  />
                </label>

                {/* Giao dịch bảo mật */}
                <div className="p-6 bg-[#fdfaf8] rounded-2xl border border-[#e5d8d0] mt-8 flex gap-4 items-start">
                  <ShieldCheck size={24} className="text-[#44683b] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-[#44683b]">Thanh toán Bảo mật SSL 256-bit</h4>
                    <p className="text-xs text-[#8a7e75] mt-1 leading-relaxed">
                      Thông tin giao dịch của bạn được mã hóa an toàn tuyệt đối. PetCare Hub không bao giờ lưu trữ thông tin chi tiết tài chính hay thẻ ngân hàng của bạn trên hệ thống.
                    </p>
                  </div>
                </div>

              </div>
            </section>

          </div>

          {/* CỘT TÓM TẮT ĐƠN ĐẶT PHÒNG (Bên Phải) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-8 border border-[#e5d8d0] shadow-xl shadow-[#a43e24]/2">
              <h3 className="text-lg font-black text-[#303330] mb-6">Tóm tắt hóa đơn gửi bé</h3>

              <div className="flex items-center gap-4 pb-6 mb-6 border-b border-[#e5d8d0]/60">
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                  <img
                    src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=200"
                    alt="Suite Sân Vườn"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#303330]">{roomName}</h4>
                  <p className="text-[10px] text-[#8a7e75] mt-0.5">Thời gian lưu trú: {nights} đêm</p>
                  <span className="inline-block mt-2 px-3 py-0.5 bg-[#fdf0ec] text-[#fa7150] text-[9px] font-black rounded-full uppercase">
                    Bé {USER_PETS.find(p => p.id === selectedPetId)?.name || 'Mimi'} lưu trú
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6 text-xs">
                <div className="flex justify-between text-[#8a7e75]">
                  <span>Chi phí phòng ({nights} đêm)</span>
                  <span className="font-bold text-[#303330]">{(roomPrice * nights).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-[#8a7e75]">
                  <span>Gói Dịch vụ thêm</span>
                  <span className="font-bold text-[#303330]">{(initialTotal - (roomPrice * nights)).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-[#8a7e75] pt-4 border-t border-[#e5d8d0]/60">
                  <span>Tạm tính</span>
                  <span className="font-bold text-[#303330]">{initialTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-[#8a7e75]">
                  <span>Phí tiện ích dịch vụ</span>
                  <span className="font-bold text-[#303330]">Miễn phí</span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-8 pt-4 border-t border-[#e5d8d0]/60">
                <span className="text-xs font-black uppercase tracking-wider text-[#44683b]">Tổng thanh toán</span>
                <span className="text-3xl font-black text-[#a43e24]">{initialTotal.toLocaleString('vi-VN')} đ</span>
              </div>

              {/* Form submit */}
              <form onSubmit={handleCompleteBooking}>
                <button
                  type="submit"
                  className="w-full bg-[#fa7150] text-white py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#fa7150]/90 transition-all cursor-pointer shadow-lg shadow-[#fa7150]/20"
                >
                  Hoàn tất đặt lịch
                </button>
              </form>
              <p className="text-center text-[9px] text-[#8a7e75] mt-4 leading-relaxed">
                Bằng việc nhấp hoàn tất đặt lịch, bạn đồng ý với <a href="#" className="underline text-[#fa7150]">Điều khoản dịch vụ</a> và <a href="#" className="underline text-[#fa7150]">Chính sách hủy đơn</a> của PetCare Hub.
              </p>

            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
