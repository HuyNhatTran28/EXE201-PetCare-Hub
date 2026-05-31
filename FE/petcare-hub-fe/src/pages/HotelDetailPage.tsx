import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  PawPrint,
  MapPin,
  Sparkles,
  CheckCircle,
  ArrowRight,
  Info,
  QrCode,
  ChevronDown
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { Header } from '@/components/Header'

interface RoomType {
  id: string
  name: string
  pricePerNight: number
  petType: string
  description: string
  image: string
  isPopular?: boolean
}

interface ExtraService {
  id: string
  name: string
  price: number
  desc: string
}

interface PetType {
  id: string
  name: string
  breed: string
  avatarUrl: string | null
}

const DEFAULT_ROOMS: RoomType[] = [
  {
    id: 'b8e72c84-9dbb-4ae1-8d2a-71b56ce8145a', // UUID hợp lệ cho Paws & Claws Resort Room
    name: 'Paws & Claws Resort Room',
    pricePerNight: 750000,
    petType: 'Chó & Mèo - Mọi kích cỡ',
    description: 'Có sân chơi thảm cỏ tự nhiên rộng rãi, trang bị hệ thống lọc không khí y tế, Webcam giám sát HD 24/7 và điều hòa AC mát mẻ.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARBsWtsWewrdsB2obZbAbXn2po_wK5odNt5ljTeTOTgg_D9sj6ZUEAz3zCqJCRhoZMvA00XKoksIAHg--Wb0Z7ReeeW2AQE2dcE05tK0Vt-pE7xSX1XIcdM9Prb7wFNcirJUNCZqaNr-gfY0muoA9YS47oPk0Vt9M0CcEMdf6AD5aZIDjAXcHwERyHZpD47emS1Tb8apI4CQ-Vy_buRVA9gBba03RTyFEdPssBD_rHNpnxzRAGRTZoTlNC0JKD6Fb_YfGyBfY_aUdw',
    isPopular: true
  },
  {
    id: 'a12e3456-789b-12d3-a456-426614174000',
    name: 'Zen Cat Loft',
    pricePerNight: 450000,
    petType: 'Chỉ dành cho Mèo',
    description: 'Không gian leo trèo bằng gỗ tự nhiên hữu cơ, trang bị tháp cào móng cao cấp và tinh dầu thảo dược giúp mèo cưng giảm căng thẳng.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABxHktaS5nJDegnqExeOW6p503wyn9bzBKpGpRONq3vzlD7vTHHoXFTA8rkiw5N8YzJJutiPToZgjVKhrPCsyQcr8DSf4nNIJ6r-dAyQF7ZBa9M5yOlScqcE587gqJrSYKeoOTi2VZOZUOEvzgzP0KEMMY3Ckq242HujjmnCsTa-67mD4ARtLF-_bbvb1e9lecXpqb3wTLbd64c924fz09-l3Y10tCNSTecVcKUWL10F_aOYLnMKdbytixsYS3g6AUCivjILTw_6MR',
    isPopular: false
  },
  {
    id: 'a12e3456-789b-12d3-a456-426614174001',
    name: 'Tiny Paws Studio',
    pricePerNight: 320000,
    petType: 'Thú cưng cỡ nhỏ (Thỏ, Hamster)',
    description: 'Lồng kính chịu lực cách âm tốt, đồ chơi an toàn bằng tre tự nhiên và chu kỳ chiếu sáng dịu nhẹ giả lập mặt trời mọc.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZmWA2PZNHDcMnZRFJsBw-wJ6XChRJqNatNPFw2WaJIGpHHSJAk0VUXTKVFj1WvQBGhFCg702Onwmnp7jBZo_XhpO9gAGpT0YyRrdoGhyR6euAPaMUG9H4350a1PkVwQE0_onyBbXNKjLQ5OlvvB5swKGF2R7Ep_U43q9MCsGto8zrv0uIoFvGvy0CrkHl97DtiTL-lufFxqGNYo8yr4JsVKXdp2i-Sz2IQXiT_yeN2ptxKkbhk5IiEP705LIvf5IUDviR9HIMRtWT',
    isPopular: false
  }
]

const DEFAULT_SERVICES: ExtraService[] = [
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81451', name: 'Tắm sấy spa', price: 250000, desc: 'Tắm gội làm sạch lông chuyên sâu và sấy khô tạo phồng thơm tho.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81452', name: 'Xe đưa đón', price: 200000, desc: 'Đưa đón tận nhà hai chiều chuyên dụng, an toàn, thoải mái.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81453', name: 'Dưỡng ẩm da & Cắt tỉa móng', price: 150000, desc: 'Chăm sóc móng chân sạch sẽ và thoa dầu dưỡng tự nhiên.' }
]

export const HotelDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [hotelName, setHotelName] = useState('Nemo Pet Resort')
  const [hotelAddress, setHotelAddress] = useState('Đường Nguyễn Thị Minh Khai, Quận 1, TP. HCM')
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(DEFAULT_ROOMS)
  const [services, setServices] = useState<ExtraService[]>(DEFAULT_SERVICES)
  
  // Trạng thái chọn đặt phòng
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([DEFAULT_SERVICES[0].id, DEFAULT_SERVICES[1].id])
  const [nights, setNights] = useState(1)
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  
  // Trạng thái mã giảm giá
  const [couponCode, setCouponCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponMessage, setCouponMessage] = useState('')

  // Trạng thái thú cưng
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')

  // Trạng thái tải dữ liệu & tạo đơn
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')

  useEffect(() => {
    const loadDetails = async () => {
      try {
        // Tải thông tin KS
        const hotelRes = await axiosInstance.get(`/api/hotels/${id}`)
        if (hotelRes.data) {
          setHotelName(hotelRes.data.name)
          setHotelAddress(hotelRes.data.address || 'Hồ Chí Minh, Việt Nam')
        }

        // Tải các loại phòng thực tế từ backend
        const roomsRes = await axiosInstance.get(`/api/room-types/hotel/${id}`)
        if (roomsRes.data && roomsRes.data.length > 0) {
          const list = roomsRes.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            pricePerNight: r.pricePerNight,
            petType: r.allowedPetTypes?.join(', ') || 'Chó & Mèo',
            description: r.description || 'Không gian ấm cúng, đầy đủ tiện ích cơ bản cho bé cưng.',
            image: r.images && r.images.length > 0 ? r.images[0] : 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800'
          }))
          setRoomTypes(list)
          setSelectedRoomId(list[0].id)
        }

        // Tải các dịch vụ của khách sạn từ backend
        const servicesRes = await axiosInstance.get(`/api/services/hotel/${id}`)
        if (servicesRes.data && servicesRes.data.length > 0) {
          const list = servicesRes.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            price: s.price,
            desc: s.description || 'Gói dịch vụ chăm sóc tiện ích bổ sung.'
          }))
          setServices(list)
        }
      } catch (error) {
        console.error('Failed to fetch details, falling back to mock data', error)
      }

      try {
        // Tải danh sách thú cưng của user để liên kết booking
        const petsRes = await axiosInstance.get('/api/pets/my')
        if (petsRes.data && petsRes.data.length > 0) {
          setPets(petsRes.data)
          setSelectedPetId(petsRes.data[0].id)
        }
      } catch (error) {
        console.error('Failed to load user pets', error)
      } finally {
        setLoading(false)
      }
    }
    loadDetails()
  }, [id])

  // Áp dụng mã giảm giá PETWELCOME10
  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'PETWELCOME10') {
      setDiscountPercent(10)
      setCouponMessage('Đã áp dụng mã giảm giá PETWELCOME10 (-10%)')
    } else {
      setDiscountPercent(0)
      setCouponMessage('Mã giảm giá không hợp lệ hoặc đã hết hạn.')
    }
  }

  // Xử lý chọn dịch vụ phụ trợ
  const handleToggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(sid => sid !== serviceId))
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId])
    }
  }

  // Tính toán hóa đơn
  const activeRoom = roomTypes.find(r => r.id === selectedRoomId) || DEFAULT_ROOMS[0]
  const roomCost = activeRoom.pricePerNight * nights
  const selectedServicesList = services.filter(s => selectedServiceIds.includes(s.id))
  const servicesCost = selectedServicesList.reduce((sum, s) => sum + s.price, 0)
  
  const subTotal = roomCost + servicesCost
  const discountAmount = Math.round(subTotal * (discountPercent / 100))
  const totalCost = subTotal - discountAmount

  // Tính nights từ checkIn/checkOut
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const diff = Math.ceil(
        (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      )
      if (diff > 0) setNights(diff)
    }
  }, [checkInDate, checkOutDate])

  // Đặt phòng ngay và lưu vào Database
  const handleCreateBooking = async () => {
    if (!selectedPetId) {
      alert('Bạn phải thêm thú cưng ở Trang quản lý thú cưng trước khi đặt phòng!')
      return
    }

    setBookingLoading(true)
    try {
      const payload = {
        hotelId: id,
        roomTypeId: selectedRoomId,
        checkInDate: checkInDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        checkOutDate: checkOutDate || new Date(Date.now() + 86400000 * (nights + 1)).toISOString().split('T')[0],
        petIds: [selectedPetId],
        serviceIds: selectedServiceIds,
        voucherCode: discountPercent > 0 ? couponCode : null
      }

      const response = await axiosInstance.post('/api/bookings', payload)
      if (response.data) {
        setInvoiceNumber(response.data.invoiceNumber || 'INV-SANCTU')
        setIsSuccess(true)
      }
    } catch (error: any) {
      console.error('Failed to create booking', error)
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi đặt phòng. Vui lòng kiểm tra vai trò OWNER của bạn.')
    } finally {
      setBookingLoading(false)
    }
  }

  // Style helpers
  const sunlightShadow = { boxShadow: '0 20px 40px rgba(48, 51, 48, 0.06)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#ffac98] selection:text-[#751c05] pb-24 text-left">
      
      {/* ── HEADER ── */}
      <Header />

      {/* MODAL ĐẶT PHÒNG THÀNH CÔNG */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-[#e1e3df] animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-[#d0fac0] text-[#44683b] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-[#303330] mb-2">Đặt phòng thành công!</h3>
            <p className="text-xs text-[#5d605c] leading-relaxed mb-6">
              Mã hóa đơn của bạn là <strong className="text-[#a43e24]">{invoiceNumber}</strong>. Trạng thái đặt phòng đã được lưu vào cơ sở dữ liệu là <span className="font-bold text-[#a43e24]">PENDING</span> (Chờ thanh toán).
            </p>
            
            <div className="bg-[#f4f4f0] border border-[#e1e3df] rounded-2xl p-4 mb-6 flex flex-col items-center">
              <QrCode size={140} className="text-[#303330] mb-3" />
              <p className="text-[10px] font-black text-[#a43e24] uppercase tracking-wider">Quét VietQR để thanh toán</p>
              <p className="text-[10px] text-[#5d605c] mt-0.5 font-bold">Số tiền: {totalCost.toLocaleString('vi-VN')} đ</p>
            </div>

            <button 
              onClick={() => navigate('/pets')}
              className="w-full bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all"
            >
              Xem Nhật Ký Thú Cưng <ArrowRight size={14} className="inline ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* ── CHI TIẾT ĐẶT PHÒNG ── */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        
        {/* Tiêu đề & Địa chỉ */}
        <header className="mb-12 relative text-left">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#d0fac0]/20 opacity-40 rounded-full blur-3xl pointer-events-none -z-10" />
          <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Chi tiết Resort nghỉ dưỡng</span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#303330] mb-3 mt-1">
            {hotelName}
          </h1>
          <p className="text-[#5d605c] flex items-center gap-1.5 text-sm sm:text-base">
            <MapPin size={16} className="text-[#a43e24]" />
            {hotelAddress}
          </p>
        </header>

        {/* Nội dung chia cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* CỘT PHÒNG NGHỈ (Trái) */}
          <div className="lg:col-span-8 space-y-8">
            <h2 className="text-2xl font-extrabold font-headline mb-4">1. Chọn loại phòng nghỉ dưỡng</h2>
            
            {loading ? (
              <div className="text-center py-12 text-stone-500 font-bold">Đang tải danh sách phòng...</div>
            ) : (
              roomTypes.map((room) => {
                const isSelected = selectedRoomId === room.id
                return (
                  <div 
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 border-2 cursor-pointer ${
                      isSelected 
                        ? 'border-[#a43e24] shadow-xl shadow-[#a43e24]/5' 
                        : 'border-[#e1e3df] hover:border-[#a43e24]/30'
                    }`}
                    style={sunlightShadow}
                  >
                    <div className="grid md:grid-cols-12">
                      <div className="md:col-span-5 h-52 md:h-full relative overflow-hidden">
                        <img 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103" 
                          src={room.image} 
                          alt={room.name}
                        />
                        {room.isPopular && (
                          <div className="absolute top-4 left-4 bg-[#a43e24] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Được yêu thích nhất
                          </div>
                        )}
                      </div>
                      <div className="md:col-span-7 p-6 flex flex-col justify-between text-left">
                        <div>
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <h3 className="text-xl font-bold text-[#303330] group-hover:text-[#a43e24] transition-colors">{room.name}</h3>
                            <span className="text-[#a43e24] font-black text-lg shrink-0">
                              {room.pricePerNight.toLocaleString('vi-VN')} đ<span className="text-xs font-normal text-stone-500">/đêm</span>
                            </span>
                          </div>
                          <span className="inline-block text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                            {room.petType}
                          </span>
                          <p className="text-xs text-[#5d605c] leading-relaxed mb-4">{room.description}</p>
                        </div>
                        <button 
                          className={`w-full py-3 rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                            isSelected 
                              ? 'bg-[#a43e24] text-white shadow-lg shadow-[#a43e24]/10' 
                              : 'bg-[#f4f4f0] text-[#303330] hover:bg-[#a43e24] hover:text-white'
                          }`}
                        >
                          {isSelected ? (
                            <>Đã Chọn Phòng Này <CheckCircle size={16} /></>
                          ) : (
                            <>Chọn Phòng Này</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* CỘT THÔNG TIN HÓA ĐƠN & DỊCH VỤ PHỤ TRỢ (Phải) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-2xl p-8 border border-[#e1e3df] shadow-2xl relative text-left" style={sunlightShadow}>
              
              {/* Chọn Thú Cưng lưu trú */}
              <h3 className="text-lg font-black text-[#303330] mb-4 flex items-center gap-2">
                <PawPrint size={18} className="text-[#a43e24]" /> Bạn muốn gửi bé cưng nào?
              </h3>
              {pets.length === 0 ? (
                <div className="p-4 bg-[#feeadb] rounded-xl text-xs text-[#63564b] font-medium mb-6">
                  Bạn chưa có bé thú cưng nào. Vui lòng bấm vào <Link to="/pets" className="underline font-bold text-[#a43e24]">đây</Link> để thêm thú cưng của bạn trước.
                </div>
              ) : (
                <div className="relative mb-6">
                  <select 
                    value={selectedPetId}
                    onChange={(e) => setSelectedPetId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e1e3df] rounded-xl text-xs font-bold text-[#303330] outline-none appearance-none cursor-pointer"
                  >
                    {pets.map(pet => (
                      <option key={pet.id} value={pet.id}>{pet.name} ({pet.breed})</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                </div>
              )}

              {/* Dịch vụ phụ trợ */}
              <h3 className="text-lg font-black text-[#303330] mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-[#a43e24]" /> Dịch vụ đi kèm cao cấp
              </h3>
              <div className="space-y-3">
                {services.map((service) => {
                  const isChecked = selectedServiceIds.includes(service.id)
                  return (
                    <label 
                      key={service.id}
                      onClick={() => handleToggleService(service.id)}
                      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        isChecked 
                          ? 'bg-[#feeadb]/20 border-[#a43e24]' 
                          : 'bg-[#faf9f6] border-[#e1e3df] hover:border-[#a43e24]/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#a43e24] focus:ring-[#a43e24]/20 border-[#b1b2af]"
                        />
                        <div>
                          <p className="font-bold text-xs text-[#303330]">{service.name}</p>
                          <p className="text-[10px] text-[#5d605c] mt-0.5">{service.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-[#a43e24]">+{service.price.toLocaleString('vi-VN')} đ</span>
                    </label>
                  )
                })}
              </div>

              {/* Chọn ngày */}
              <div className="mt-6 pt-6 border-t border-[#b1b2af]/20">
                <h3 className="text-xs font-bold text-[#5d605c] mb-3">Ngày lưu trú</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Check-in</label>
                    <input
                      type="date"
                      value={checkInDate}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      onChange={e => setCheckInDate(e.target.value)}
                      className="w-full border border-[#e5d8d0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Check-out</label>
                    <input
                      type="date"
                      value={checkOutDate}
                      min={checkInDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}
                      onChange={e => setCheckOutDate(e.target.value)}
                      className="w-full border border-[#e5d8d0] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#a43e24]"
                    />
                  </div>
                </div>
              </div>

              {/* Số đêm lưu trú */}
              <div className="mt-6 pt-6 border-t border-[#b1b2af]/20 flex items-center justify-between">
                <span className="text-xs font-bold text-[#5d605c]">Số đêm nghỉ dưỡng</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => nights > 1 && setNights(nights - 1)}
                    className="w-8 h-8 rounded-full border border-[#e1e3df] flex items-center justify-center text-sm font-bold hover:bg-[#a43e24] hover:text-white transition-all"
                  >
                    -
                  </button>
                  <span className="text-sm font-black w-6 text-center">{nights}</span>
                  <button 
                    onClick={() => setNights(nights + 1)}
                    className="w-8 h-8 rounded-full border border-[#e1e3df] flex items-center justify-center text-sm font-bold hover:bg-[#a43e24] hover:text-white transition-all"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Nhập mã giảm giá PETWELCOME10 */}
              <div className="mt-6 pt-6 border-t border-[#b1b2af]/20">
                <label className="block text-xs font-bold text-[#5d605c] mb-2">Mã ưu đãi / Coupon</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ví dụ: PETWELCOME10"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-grow rounded-xl border-[#e1e3df] px-4 py-2 text-xs focus:ring-[#a43e24] focus:border-[#a43e24]"
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    className="bg-[#a43e24] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shrink-0"
                  >
                    Áp dụng
                  </button>
                </div>
                {couponMessage && (
                  <p className={`text-[10px] font-bold mt-2 ${discountPercent > 0 ? 'text-[#44683b]' : 'text-[#a43e24]'}`}>
                    {couponMessage}
                  </p>
                )}
              </div>

              {/* Tóm tắt hóa đơn và Đặt phòng */}
              <div className="mt-6 pt-6 border-t border-[#b1b2af]/20 space-y-4 text-xs">
                <div className="flex justify-between text-[#5d605c]">
                  <span>Chi phí phòng ({nights} đêm)</span>
                  <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')} đ</span>
                </div>
                {selectedServicesList.length > 0 && (
                  <div className="flex justify-between text-[#5d605c]">
                    <span>Gói dịch vụ đi kèm</span>
                    <span className="font-bold text-[#303330]">{servicesCost.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                {discountPercent > 0 && (
                  <div className="flex justify-between text-[#44683b] font-bold">
                    <span>Giảm giá coupon ({discountPercent}%)</span>
                    <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
                
                <div className="p-4 bg-[#feeadb]/30 rounded-xl mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-[#303330]">Tổng chi phí dự kiến</span>
                    <span className="text-xl font-black text-[#a43e24]">{totalCost.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <button 
                  onClick={handleCreateBooking}
                  disabled={bookingLoading}
                  className="w-full bg-[#a43e24] text-white py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#a43e24]/10 disabled:opacity-50"
                >
                  {bookingLoading ? 'Đang tạo lịch...' : 'Đặt Ngay'} <ArrowRight size={14} />
                </button>
                
                <p className="text-center text-[10px] text-stone-500 flex items-center justify-center gap-1.5">
                  <Info size={12} className="text-[#a43e24]" /> Trạng thái booking lưu trữ là PENDING
                </p>
              </div>

            </div>
          </div>

        </div>

      </main>

    </div>
  )
}
