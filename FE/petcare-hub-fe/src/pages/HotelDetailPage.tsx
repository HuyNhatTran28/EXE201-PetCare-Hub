import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  PawPrint,
  Heart,
  Star,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Coffee,
  CheckCircle,
  Scissors,
  Truck,
  ArrowRight,
  Info,
  ChevronLeft
} from 'lucide-react'

// Mock Data Chi Tiết Khách Sạn và Các Loại Phòng
const HOTEL_DETAIL = {
  id: '1',
  name: 'The Whisker Lodge - Resort Cao Cấp',
  address: 'Đường Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh',
  rating: 4.9,
  reviewsCount: 124,
  description: 'Hãy chọn không gian nghỉ ngơi hoàn hảo cho kỳ nghỉ của thú cưng. Mỗi phòng đều được thiết kế tối giản, sạch sẽ, đảm bảo mang lại sự thoải mái tối đa và sự an tâm tuyệt đối cho chủ nuôi.',
  images: [
    'https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?auto=format&fit=crop&q=80&w=1200',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=400'
  ],
  roomTypes: [
    {
      id: 'rt1',
      name: 'Phòng Chờ Tắm Nắng (Sunlit Lounge)',
      pricePerNight: 450000,
      petType: 'Chỉ dành cho Mèo',
      description: 'Sân chơi yên tĩnh với cửa sổ lớn từ trần sát sàn hứng trọn ánh nắng ấm tự nhiên và đệm chỉnh hình cao cấp giúp mèo cưng thư giãn tối đa.',
      image: 'https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?auto=format&fit=crop&q=80&w=600',
      isPopular: true
    },
    {
      id: 'rt2',
      name: 'Suite Sân Vườn (Garden Suite)',
      pricePerNight: 750000,
      petType: 'Chó - Mọi kích cỡ',
      description: 'Có lối đi riêng trực tiếp ra thảm cỏ an toàn, được trang bị điều hòa 24/7 và webcam HD giám sát trực tiếp để chủ nuôi theo dõi.',
      image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=600',
      isPopular: false
    },
    {
      id: 'rt3',
      name: 'Nơi Ẩn Mình Yên Tĩnh (Quiet Sanctuary)',
      pricePerNight: 600000,
      petType: 'Thú cưng cỡ nhỏ',
      description: 'Được thiết kế cho các bé lớn tuổi hoặc những bé nhút nhát thích không gian tĩnh lặng. Tường cách âm cao và sử dụng tinh dầu trị liệu giảm lo âu.',
      image: 'https://images.unsplash.com/photo-1541599540903-216a46ca1ad0?auto=format&fit=crop&q=80&w=600',
      isPopular: false
    }
  ],
  extraServices: [
    { id: 's1', name: 'Tắm & Sấy Thơm Thoa', price: 250000, desc: 'Tắm gội làm sạch chuyên sâu và sấy khô tạo độ phồng cho lông.' },
    { id: 's2', name: 'Sanctuary Spa Cao Cấp', price: 400000, desc: 'Liệu pháp cắt tỉa móng, mài dũa bàn chân và dưỡng ẩm da.' },
    { id: 's3', name: 'Cắt Tỉa Tạo Kiểu Lông', price: 550000, desc: 'Tạo kiểu lông nghệ thuật chuẩn giống loài bởi Stylist hàng đầu.' },
    { id: 's4', name: 'Đưa Đón Thú Cưng Tận Nhà', price: 200000, desc: 'Xe đưa đón chuyên dụng 2 chiều trong bán kính 10km.' }
  ]
}

export const HotelDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  // Trạng thái chọn phòng
  const [selectedRoomId, setSelectedRoomId] = useState('rt2')
  
  // Trạng thái chọn dịch vụ thêm
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(['s1'])

  // Trạng thái số ngày đặt phòng
  const [nights, setNights] = useState(1)

  // Xử lý khi chọn/bỏ chọn dịch vụ
  const handleToggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(id => id !== serviceId))
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId])
    }
  }

  // Lấy chi tiết phòng và dịch vụ đang chọn để tính toán hóa đơn
  const selectedRoom = HOTEL_DETAIL.roomTypes.find(rt => rt.id === selectedRoomId) || HOTEL_DETAIL.roomTypes[1]
  const roomCost = selectedRoom.pricePerNight * nights

  const selectedServices = HOTEL_DETAIL.extraServices.filter(s => selectedServiceIds.includes(s.id))
  const servicesCost = selectedServices.reduce((sum, s) => sum + s.price, 0)

  const totalCost = roomCost + servicesCost

  const handleBooking = () => {
    // Điều hướng sang trang thanh toán hoặc xác nhận
    navigate(`/booking/${selectedRoom.id}?nights=${nights}&services=${selectedServiceIds.join(',')}&total=${totalCost}`)
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#fa7150] selection:text-white pb-16">
      
      {/* ── HEADER (NAVBAR) ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2">
          <PawPrint size={28} className="text-[#fa7150]" />
          <span className="text-xl font-bold tracking-tight">Pet Sanctuary</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/hotels" className="flex items-center gap-1.5 text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">
            <ChevronLeft size={16} /> Quay lại danh sách
          </Link>
        </div>
      </header>

      {/* ── CHI TIẾT KHÁCH SẠN ───────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Banner tiêu đề trang */}
        <header className="mb-12 relative text-left">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#d0fac0]/20 opacity-40 rounded-full blur-3xl pointer-events-none -z-10" />
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#303330] mb-4">
            Chọn không gian nghỉ ngơi
          </h1>
          <p className="text-[#5a5550] max-w-3xl text-sm sm:text-base leading-relaxed">
            Hãy chọn môi trường hoàn hảo cho kỳ nghỉ của cưng yêu. Mỗi phòng nghỉ đều được thiết kế rộng mở, vệ sinh sát khuẩn hằng ngày để mang lại sự an tâm tuyệt đối cho chủ nuôi.
          </p>
        </header>

        {/* Nội dung chia 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* CỘT DANH SÁCH CÁC HẠNG PHÒNG (Bên Trái) */}
          <div className="lg:col-span-8 space-y-8">
            
            {HOTEL_DETAIL.roomTypes.map((room) => {
              const isSelected = selectedRoomId === room.id
              return (
                <div 
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-300 border cursor-pointer hover:shadow-xl ${
                    isSelected 
                      ? 'border-[#fa7150] shadow-xl shadow-[#fa7150]/5 bg-[#fdfcfb]' 
                      : 'border-[#e5d8d0]'
                  }`}
                >
                  <div className="grid md:grid-cols-12">
                    {/* Hình ảnh phòng */}
                    <div className="md:col-span-5 h-56 md:h-full relative overflow-hidden">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500" 
                        src={room.image} 
                        alt={room.name}
                      />
                      {room.isPopular && (
                        <div className="absolute top-4 left-4 bg-[#fa7150] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-lg">
                          Phổ biến nhất
                        </div>
                      )}
                    </div>

                    {/* Thông tin phòng */}
                    <div className="md:col-span-7 p-6 flex flex-col justify-between text-left">
                      <div>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h3 className="text-xl font-bold text-[#303330] group-hover:text-[#fa7150] transition-colors">
                            {room.name}
                          </h3>
                          <span className="text-[#a43e24] font-black text-lg shrink-0">
                            {room.pricePerNight.toLocaleString('vi-VN')} đ<span className="text-xs font-normal text-[#8a7e75]">/đêm</span>
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-bold text-[#44683b] bg-[#d0fac0] px-3 py-1 rounded-full mb-4">
                          {room.petType}
                        </span>
                        <p className="text-[#5a5550] text-xs leading-relaxed mb-6">
                          {room.description}
                        </p>
                      </div>

                      {/* Nút chọn trạng thái */}
                      <button 
                        className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected 
                            ? 'bg-[#fa7150] text-white shadow-lg shadow-[#fa7150]/20' 
                            : 'bg-[#fbf7f4] text-[#303330] hover:bg-[#fa7150] hover:text-white'
                        }`}
                      >
                        {isSelected ? (
                          <>Đã chọn phòng này <CheckCircle size={16} /></>
                        ) : (
                          <>Chọn phòng nghỉ này</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

          </div>

          {/* CỘT THÔNG TIN HÓA ĐƠN & DỊCH VỤ THÊM (Bên Phải - Sticky) */}
          <div className="lg:col-span-4 space-y-8">
            
            <div className="bg-white rounded-3xl p-8 border border-[#e5d8d0] sticky top-24 shadow-xl shadow-[#a43e24]/2 text-left">
              
              {/* Dịch vụ phụ trợ */}
              <h2 className="text-lg font-black text-[#303330] mb-6 flex items-center gap-2">
                <Sparkles size={18} className="text-[#fa7150]" /> Gói dịch vụ thêm cao cấp
              </h2>

              <div className="space-y-4">
                {HOTEL_DETAIL.extraServices.map((service) => {
                  const isChecked = selectedServiceIds.includes(service.id)
                  return (
                    <label 
                      key={service.id}
                      onClick={() => handleToggleService(service.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-colors ${
                        isChecked 
                          ? 'bg-[#fdfcfb] border-[#fa7150]' 
                          : 'bg-[#fdfaf8] border-[#e5d8d0] hover:bg-white hover:border-[#fa7150]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}} // Đã xử lý ở onClick cấp label
                          className="w-4.5 h-4.5 rounded text-[#fa7150] focus:ring-[#fa7150] border-[#e5d8d0]"
                        />
                        <div>
                          <p className="font-bold text-xs text-[#303330]">{service.name}</p>
                          <p className="text-[10px] text-[#8a7e75] mt-0.5">{service.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#fa7150]">+{service.price.toLocaleString('vi-VN')} đ</span>
                    </label>
                  )
                })}
              </div>

              {/* Tăng/giảm số đêm gửi */}
              <div className="mt-6 pt-6 border-t border-[#e5d8d0]/60 flex items-center justify-between">
                <span className="text-xs font-bold text-[#8a7e75]">Số đêm lưu trú</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => nights > 1 && setNights(nights - 1)}
                    className="w-8 h-8 rounded-full border border-[#e5d8d0] flex items-center justify-center text-sm font-bold text-[#303330] hover:bg-[#fa7150] hover:text-white transition-colors cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-sm font-black text-[#303330] w-6 text-center">{nights}</span>
                  <button 
                    onClick={() => setNights(nights + 1)}
                    className="w-8 h-8 rounded-full border border-[#e5d8d0] flex items-center justify-center text-sm font-bold text-[#303330] hover:bg-[#fa7150] hover:text-white transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Tóm tắt tính tiền đơn hàng */}
              <div className="mt-6 pt-6 border-t border-[#e5d8d0]/60 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#8a7e75]">{selectedRoom.name} ({nights} đêm)</span>
                  <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')} đ</span>
                </div>
                {selectedServices.map(service => (
                  <div key={service.id} className="flex justify-between items-center text-xs">
                    <span className="text-[#8a7e75]">{service.name}</span>
                    <span className="font-bold text-[#303330]">{service.price.toLocaleString('vi-VN')} đ</span>
                  </div>
                ))}
                
                <div className="p-4 bg-[#fdf0ec] rounded-2xl mb-6 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-sm text-[#303330]">Tổng chi phí dự kiến</span>
                    <span className="text-xl font-black text-[#a43e24]">{totalCost.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                {/* Nút hành động chính */}
                <button 
                  onClick={handleBooking}
                  className="w-full bg-[#fa7150] text-white py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-[#fa7150]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#fa7150]/20"
                >
                  Tiếp tục: Thông tin Thú cưng <ArrowRight size={14} />
                </button>
                <p className="text-center text-[10px] text-[#8a7e75] mt-3 flex items-center justify-center gap-1.5">
                  <Info size={12} className="text-[#fa7150]" /> Bạn chưa bị tính phí tại bước này
                </p>
              </div>

            </div>

          </div>

        </div>

      </main>

    </div>
  )
}
