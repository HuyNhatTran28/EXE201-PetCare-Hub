import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  PawPrint,
  MapPin,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Heart,
  Scissors,
  Bookmark,
  ShieldCheck
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { Header } from '@/components/Header'
import { Map } from '@/components/Map'

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
    id: 'b8e72c84-9dbb-4ae1-8d2a-71b56ce8145a',
    name: 'Deluxe Garden View',
    pricePerNight: 1200000,
    petType: 'Chó & Mèo - Mọi kích cỡ',
    description: 'Căn phòng rộng 20m² với tầm nhìn trực diện ra khu vườn trung tâm. Trang bị nệm memory foam và hệ thống lọc khí chuyên dụng.',
    image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
    isPopular: true
  },
  {
    id: 'a12e3456-789b-12d3-a456-426614174000',
    name: 'Royal Cat Suite',
    pricePerNight: 2500000,
    petType: 'Chỉ dành cho Mèo',
    description: 'Trải nghiệm hoàng gia với hệ thống leo trèo đa tầng, thác nước mini và chế độ chăm sóc đặc biệt 1-kèm-1.',
    image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
    isPopular: false
  }
]

const DEFAULT_SERVICES: ExtraService[] = [
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81451', name: 'Spa & Massage', price: 450000, desc: 'Liệu trình massage bằng tinh dầu hữu cơ giúp giảm căng thẳng.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81452', name: 'Cắt Tỉa Chuyên Nghiệp', price: 350000, desc: 'Tỉa lông nghệ thuật, cắt móng và vệ sinh tai bởi các chuyên gia.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81453', name: 'Huấn Luyện Cơ Bản', price: 600000, desc: 'Rèn luyện các lệnh cơ bản và cải thiện hành vi xã hội.' },
  { id: '13a52c84-9dbb-4ae1-8d2a-71b56ce81454', name: 'Ẩm Thực Gourmet', price: 200000, desc: 'Thực đơn tươi mới được chế biến hàng ngày bởi bếp trưởng.' }
]

export const HotelDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [hotelName, setHotelName] = useState('PetCare Sanctuary')
  const [hotelAddress, setHotelAddress] = useState('Đường Nguyễn Thị Minh Khai, Quận 1, TP. HCM')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLong, setLocationLong] = useState<number | null>(null)
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string | null>(null)
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(DEFAULT_ROOMS)
  const [services, setServices] = useState<ExtraService[]>(DEFAULT_SERVICES)
  
  // Trạng thái Stepper: 1 -> 5
  const [step, setStep] = useState<number>(1)

  // Trạng thái đặt phòng
  const [selectedRoomId, setSelectedRoomId] = useState(DEFAULT_ROOMS[0].id)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [nights, setNights] = useState(1)
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [entryTime, setEntryTime] = useState('08:00')
  const [exitTime, setExitTime] = useState('18:00')
  
  // Trạng thái thú cưng
  const [pets, setPets] = useState<PetType[]>([])
  const [selectedPetId, setSelectedPetId] = useState('')
  const [petNameInput, setPetNameInput] = useState('')
  const [petBreedInput, setPetBreedInput] = useState('')
  const [petAgeInput, setPetAgeInput] = useState('')
  const [petWeightInput, setPetWeightInput] = useState('')
  const [specialRequestInput, setSpecialRequestInput] = useState('')

  // Trạng thái mã giảm giá
  const [couponCode, setCouponCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponMessage, setCouponMessage] = useState('')

  // Trạng thái chọn phương thức thanh toán
  const [paymentMethod, setPaymentMethod] = useState<'VIETQR' | 'MOMO' | 'VNPAY'>('VIETQR')

  // Trạng thái tải dữ liệu & tạo đơn
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const hotelRes = await axiosInstance.get(`/api/hotels/${id}`)
        if (hotelRes.data) {
          setHotelName(hotelRes.data.name)
          setHotelAddress(hotelRes.data.address || 'Hồ Chí Minh, Việt Nam')
          setLocationLat(hotelRes.data.locationLat)
          setLocationLong(hotelRes.data.locationLong)
          setGoogleMapsUrl(hotelRes.data.googleMapsUrl)
        }

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

  // Khi thay đổi thú cưng được chọn, tự động điền thông tin
  useEffect(() => {
    if (selectedPetId) {
      const selected = pets.find(p => p.id === selectedPetId)
      if (selected) {
        setPetNameInput(selected.name)
        setPetBreedInput(selected.breed || '')
        setPetAgeInput('1') // default
        setPetWeightInput('5') // default
      }
    }
  }, [selectedPetId, pets])

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === 'PETWELCOME10') {
      setDiscountPercent(10)
      setCouponMessage('Đã áp dụng mã giảm giá PETWELCOME10 (-10%)')
    } else {
      setDiscountPercent(0)
      setCouponMessage('Mã giảm giá không hợp lệ hoặc đã hết hạn.')
    }
  }

  const handleToggleService = (serviceId: string) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(sid => sid !== serviceId))
    } else {
      setSelectedServiceIds([...selectedServiceIds, serviceId])
    }
  }

  // Tính toán chi phí
  const activeRoom = roomTypes.find(r => r.id === selectedRoomId) || DEFAULT_ROOMS[0]
  const chargeNights = nights === 0 ? 1 : nights
  const roomCost = activeRoom.pricePerNight * chargeNights
  const selectedServicesList = services.filter(s => selectedServiceIds.includes(s.id))
  const servicesCost = selectedServicesList.reduce((sum, s) => sum + s.price, 0)
  
  const subTotal = roomCost + servicesCost
  const taxAmount = Math.round(subTotal * 0.1) // Phí dịch vụ/thuế 10%
  const beforeDiscount = subTotal + taxAmount
  const discountAmount = Math.round(beforeDiscount * (discountPercent / 100))
  const totalCost = beforeDiscount - discountAmount

  // Tính nights từ checkIn/checkOut
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const diff = Math.ceil(
        (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) 
        / (1000 * 60 * 60 * 24)
      )
      if (diff >= 0) setNights(diff)
    }
  }, [checkInDate, checkOutDate])

  const handleCreateBooking = async () => {
    if (!selectedPetId && !petNameInput) {
      alert('Bạn phải điền thông tin thú cưng trước khi đặt phòng!')
      return
    }

    setBookingLoading(true)
    try {
      const payload = {
        hotelId: id,
        roomTypeId: selectedRoomId,
        checkInDate: checkInDate || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        checkOutDate: checkOutDate || new Date(Date.now() + 86400000 * (nights + 1)).toISOString().split('T')[0],
        petIds: [selectedPetId || '00000000-0000-0000-0000-000000000000'],
        serviceIds: selectedServiceIds,
        voucherCode: discountPercent > 0 ? couponCode : null,
        paymentMethod: paymentMethod
      }

      const response = await axiosInstance.post('/api/bookings', payload)
      if (response.data) {
        setInvoiceNumber(response.data.invoiceNumber || 'INV-' + Date.now())
        setIsSuccess(true)
      }
    } catch (error: any) {
      console.error('Failed to create booking', error)
      alert(error.response?.data?.message || 'Có lỗi xảy ra khi đặt phòng. Vui lòng kiểm tra lại vai trò của bạn.')
    } finally {
      setBookingLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans selection:bg-[#ffac98] selection:text-[#751c05] pb-24 text-left">
      <Header />

      {/* MODAL THÀNH CÔNG */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-[#e1e3df] animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-[#d0fac0] text-[#44683b] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-[#303330] mb-1">Đặt phòng thành công!</h3>
            <p className="text-xs text-[#5d605c] mb-2">
              Mã hóa đơn: <strong className="text-[#a43e24]">{invoiceNumber}</strong>
            </p>
            <p className="text-xs text-[#5d605c] mb-6">
              Trạng thái: <span className="font-bold text-amber-600">PENDING — Chờ thanh toán</span>
            </p>

            {/* QR thanh toán */}
            {paymentMethod === 'VIETQR' && (
              <div className="bg-[#f4f4f0] border border-[#e1e3df] rounded-2xl p-4 mb-4">
                <img
                  src={`https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=${totalCost}&addInfo=${invoiceNumber}&accountName=PETCARE%20HUB`}
                  alt="QR thanh toán"
                  className="w-52 h-52 mx-auto rounded-xl"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${invoiceNumber}`
                  }}
                />
                <p className="text-[10px] font-black text-[#a43e24] uppercase tracking-wider mt-2">
                  Quét VietQR để thanh toán
                </p>
                <p className="text-[10px] text-[#5d605c] mt-0.5 font-bold">
                  Số tiền: {totalCost.toLocaleString('vi-VN')}đ
                </p>
              </div>
            )}

            {paymentMethod === 'MOMO' && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 mb-4">
                <p className="text-sm font-black text-purple-700">Thanh toán qua MoMo</p>
                <p className="text-xs text-purple-600 mt-1">
                  Chuyển khoản đến: <strong>0901234567</strong>
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Nội dung: <strong>{invoiceNumber}</strong>
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Số tiền: <strong>{totalCost.toLocaleString('vi-VN')}đ</strong>
                </p>
              </div>
            )}

            {paymentMethod === 'VNPAY' && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-4">
                <p className="text-sm font-black text-blue-700">Thanh toán qua VNPay</p>
                <p className="text-xs text-blue-600 mt-2">
                  Nội dung CK: <strong>{invoiceNumber}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Số tiền: <strong>{totalCost.toLocaleString('vi-VN')}đ</strong>
                </p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs font-bold text-amber-700">Nội dung chuyển khoản:</p>
              <p className="text-sm font-black text-amber-900 mt-1">{invoiceNumber}</p>
            </div>

            <p className="text-[10px] text-[#8a7e75] mb-6">
              Sau khi thanh toán, nhân viên sẽ xác nhận và gửi email trong vòng 15 phút.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/my-bookings')}
                className="flex-1 bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                Xem lịch sử đặt phòng <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEPPER HEADER INDICATOR ── */}
      <div className="max-w-7xl mx-auto px-8 pt-8">
        <div className="flex items-center justify-center gap-4 py-6 border-b border-[#e1e3df]">
          {[
            { s: 1, label: 'Chọn phòng' },
            { s: 2, label: 'Thông tin' },
            { s: 3, label: 'Dịch vụ' },
            { s: 4, label: 'Xác nhận' },
            { s: 5, label: 'Thanh toán' }
          ].map((item, idx) => {
            const isCompleted = step > item.s
            const isActive = step === item.s
            return (
              <div key={item.s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                  isCompleted ? 'bg-[#a43e24] border-[#a43e24] text-white' :
                  isActive ? 'bg-[#feeadb] border-[#a43e24] text-[#a43e24]' :
                  'bg-white border-[#e1e3df] text-[#8a7e75]'
                }`}>
                  {isCompleted ? <CheckCircle size={14} /> : item.s}
                </div>
                <span className={`text-xs font-bold ${isActive ? 'text-[#303330]' : 'text-[#8a7e75]'}`}>
                  {item.label}
                </span>
                {idx < 4 && (
                  <div className={`w-12 h-0.5 rounded-full ${step > item.s ? 'bg-[#a43e24]' : 'bg-[#e1e3df]'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* ── BƯỚC 1: CHỌN PHÒNG ── */}
        {step === 1 && (
          <div>
            <header className="mb-12 relative text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 1: Chọn nơi lưu trú</span>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#303330] mb-3 mt-1">
                {hotelName}
              </h1>
              <p className="text-[#5d605c] flex items-center gap-1.5 text-xs sm:text-sm mb-4">
                <MapPin size={14} className="text-[#a43e24]" />
                {hotelAddress}
                {googleMapsUrl && (
                  <a 
                    href={googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="ml-2 text-[#a43e24] hover:underline font-bold"
                  >
                    (Xem trên Google Maps ↗)
                  </a>
                )}
              </p>
              {locationLat && locationLong && (
                <div className="mb-6 max-w-full">
                  <span className="text-[10px] text-[#8a7e75] uppercase tracking-wider block mb-2 font-bold">Bản đồ vị trí (Leaflet)</span>
                  <div className="h-[250px] relative z-10">
                    <Map lat={locationLat} lng={locationLong} readonly={true} height="100%" />
                  </div>
                </div>
              )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {loading ? (
                <div className="col-span-2 text-center py-12 text-stone-500 font-bold">Đang tải danh sách phòng...</div>
              ) : (
                roomTypes.map((room) => {
                  const isSelected = selectedRoomId === room.id
                  return (
                    <div 
                      key={room.id}
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 border-2 cursor-pointer ${
                        isSelected ? 'border-[#a43e24] shadow-xl' : 'border-[#e1e3df] hover:border-[#a43e24]/30'
                      }`}
                    >
                      <div className="h-64 relative overflow-hidden">
                        <img className="w-full h-full object-cover" src={room.image} alt={room.name} />
                        {room.isPopular && (
                          <span className="absolute top-4 left-4 bg-[#a43e24] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                            Phòng Deluxe
                          </span>
                        )}
                      </div>
                      <div className="p-6 text-left flex flex-col justify-between h-56">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="text-xl font-bold text-[#303330]">{room.name}</h3>
                            <span className="text-[#a43e24] font-black text-lg shrink-0">
                              {room.pricePerNight.toLocaleString('vi-VN')} đ<span className="text-xs font-normal text-stone-500">/đêm</span>
                            </span>
                          </div>
                          <span className="inline-block text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full mt-2 mb-3 uppercase tracking-wider">
                            {room.petType}
                          </span>
                          <p className="text-xs text-[#5d605c] leading-relaxed line-clamp-2">{room.description}</p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRoomId(room.id)
                            setStep(2)
                          }}
                          className="w-full py-3.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all bg-[#a43e24] text-white hover:opacity-90 flex items-center justify-center gap-2"
                        >
                          Chọn Phòng <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── BƯỚC 2: THÔNG TIN ── */}
        {step === 2 && (
          <div className="max-w-4xl mx-auto">
            <header className="mb-10 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 2: Thông tin đặt phòng</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Chi tiết đặt phòng</h1>
              <p className="text-sm text-[#5d605c]">Vui lòng cung cấp thông tin về thời gian và thú cưng của bạn.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Thời gian lưu trú */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left">
                  <h3 className="text-sm font-bold text-[#303330] mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-[#a43e24]" /> Thời gian lưu trú
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Ngày nhận phòng</label>
                      <input
                        type="date"
                        value={checkInDate}
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        onChange={e => setCheckInDate(e.target.value)}
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Ngày trả phòng</label>
                      <input
                        type="date"
                        value={checkOutDate}
                        min={checkInDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}
                        onChange={e => setCheckOutDate(e.target.value)}
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#a43e24]"
                      />
                    </div>
                  </div>

                  {nights === 0 && checkInDate && checkOutDate && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#e1e3df]">
                      <div>
                        <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Giờ vào</label>
                        <select value={entryTime} onChange={e => setEntryTime(e.target.value)} className="w-full border border-[#e5d8d0] rounded-xl px-3 py-2 text-xs bg-white outline-none">
                          {["07:00", "08:00", "09:00", "10:00", "11:00", "12:00"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Giờ ra</label>
                        <select value={exitTime} onChange={e => setExitTime(e.target.value)} className="w-full border border-[#e5d8d0] rounded-xl px-3 py-2 text-xs bg-white outline-none">
                          {["13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Thông tin thú cưng */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-4">
                  <h3 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                    <PawPrint size={18} className="text-[#a43e24]" /> Thông tin thú cưng
                  </h3>

                  {pets.length > 0 && (
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Chọn từ danh sách của bạn</label>
                      <select 
                        value={selectedPetId}
                        onChange={(e) => setSelectedPetId(e.target.value)}
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs bg-white outline-none"
                      >
                        {pets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.breed})</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Tên thú cưng</label>
                      <input 
                        type="text" 
                        value={petNameInput} 
                        onChange={e => setPetNameInput(e.target.value)}
                        placeholder="VD: Bầu" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Giống loài</label>
                      <input 
                        type="text" 
                        value={petBreedInput} 
                        onChange={e => setPetBreedInput(e.target.value)}
                        placeholder="VD: Golden Retriever" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Tuổi (năm)</label>
                      <input 
                        type="number" 
                        value={petAgeInput} 
                        onChange={e => setPetAgeInput(e.target.value)}
                        placeholder="Tuổi của bé" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Cân nặng (kg)</label>
                      <input 
                        type="number" 
                        value={petWeightInput} 
                        onChange={e => setPetWeightInput(e.target.value)}
                        placeholder="VD: 15" 
                        className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8a7e75] font-bold uppercase block mb-1">Yêu cầu đặc biệt</label>
                    <textarea 
                      value={specialRequestInput}
                      onChange={e => setSpecialRequestInput(e.target.value)}
                      placeholder="Chế độ ăn, dị ứng hoặc thói quen đặc biệt..."
                      rows={3}
                      className="w-full border border-[#e5d8d0] rounded-xl px-4 py-2.5 text-xs outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 py-3.5 rounded-full border border-[#e1e3df] text-xs font-bold text-[#8a7e75] hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft size={14} /> Quay lại
                  </button>
                  <button 
                    onClick={() => setStep(3)}
                    disabled={!checkInDate || !checkOutDate}
                    className="flex-1 py-3.5 rounded-full bg-[#a43e24] text-white text-xs font-bold hover:opacity-90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    Tiếp tục <ArrowRight size={14} />
                  </button>
                </div>

              </div>

              {/* Sidebar Tóm tắt */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <div className="h-40 rounded-2xl overflow-hidden">
                    <img className="w-full h-full object-cover" src={activeRoom.image} alt={activeRoom.name} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full uppercase tracking-wider">
                      Phòng đã chọn
                    </span>
                    <h3 className="text-lg font-black mt-2 text-[#303330]">{activeRoom.name}</h3>
                  </div>
                  <div className="space-y-2 border-t border-[#e1e3df] pt-4 text-xs">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Giá mỗi đêm</span>
                      <span className="font-bold text-[#303330]">{activeRoom.pricePerNight.toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Số đêm</span>
                      <span className="font-bold text-[#303330]">{nights} đêm</span>
                    </div>
                    <div className="flex justify-between text-[#303330] font-black text-sm pt-2 border-t border-dashed border-[#e1e3df]">
                      <span>Tạm tính</span>
                      <span>{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 3: DỊCH VỤ ── */}
        {step === 3 && (
          <div>
            <header className="mb-12 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 3: Gói chăm sóc cá nhân hóa</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Dịch Vụ Đặc Quyền</h1>
              <p className="text-sm text-[#5d605c]">
                Nâng tầm trải nghiệm cho thú cưng của bạn với các gói chăm sóc cao cấp.
              </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {services.map((service) => {
                  const isChecked = selectedServiceIds.includes(service.id)
                  return (
                    <div 
                      key={service.id}
                      onClick={() => handleToggleService(service.id)}
                      className={`bg-white rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isChecked ? 'border-[#a43e24] shadow-lg' : 'border-[#e1e3df] hover:border-[#a43e24]/30'
                      }`}
                    >
                      <div className="text-left space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#feeadb]/40 flex items-center justify-center text-[#a43e24] mb-4">
                          {service.name.includes('Spa') ? <Heart size={20} /> :
                           service.name.includes('Cắt') ? <Scissors size={20} /> :
                           service.name.includes('Huấn') ? <ShieldCheck size={20} /> :
                           <Sparkles size={20} />}
                        </div>
                        <h4 className="text-lg font-black text-[#303330]">{service.name}</h4>
                        <p className="text-xs text-[#8a7e75] leading-relaxed">{service.desc}</p>
                      </div>
                      <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#e1e3df]">
                        <span className="text-xs font-black text-[#a43e24]">+{service.price.toLocaleString('vi-VN')} đ</span>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                          isChecked ? 'bg-[#a43e24] text-white' : 'bg-[#faf9f6] text-[#8a7e75]'
                        }`}>
                          {isChecked ? 'Đã chọn' : 'Thêm dịch vụ'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Sidebar Tóm tắt đơn hàng */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <h3 className="text-lg font-black text-[#303330]">Tóm tắt đơn hàng</h3>
                  <div className="space-y-3 text-xs border-b border-[#e1e3df] pb-4">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Phí lưu trú</span>
                      <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedServicesList.map(s => (
                      <div key={s.id} className="flex justify-between text-[#8a7e75]">
                        <span>{s.name}</span>
                        <span className="font-bold text-[#303330]">{s.price.toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-[#303330] text-sm">Tổng cộng</span>
                    <span className="text-xl font-black text-[#a43e24]">{(roomCost + servicesCost).toLocaleString('vi-VN')}đ</span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={() => setStep(4)}
                      className="w-full bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#a43e24]/10"
                    >
                      Tiếp theo: Xác nhận <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full py-3.5 rounded-full border border-[#e1e3df] text-[#8a7e75] font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 4: XÁC NHẬN DỊCH VỤ ── */}
        {step === 4 && (
          <div>
            <header className="mb-12 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 4: Xác nhận thông tin</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Xác nhận dịch vụ</h1>
              <p className="text-sm text-[#5d605c]">Vui lòng kiểm tra lại thông tin chi tiết của bạn trước khi thanh toán.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Phòng đã chọn card */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left flex gap-6">
                  <div className="w-48 h-32 rounded-2xl overflow-hidden shrink-0">
                    <img className="w-full h-full object-cover" src={activeRoom.image} alt={activeRoom.name} />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <span className="text-[9px] font-black text-[#2c4e24] bg-[#d0fac0] px-3 py-1 rounded-full uppercase tracking-wider">
                        Phòng đã chọn
                      </span>
                      <h3 className="text-xl font-bold mt-2 text-[#303330]">{activeRoom.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[#8a7e75] block">Ngày nhận</span>
                        <strong className="text-[#303330]">{checkInDate}</strong>
                      </div>
                      <div>
                        <span className="text-[#8a7e75] block">Ngày trả</span>
                        <strong className="text-[#303330]">{checkOutDate}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Thông tin thú cưng & Lưu ý */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-3">
                    <h4 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                      <PawPrint size={16} className="text-[#a43e24]" /> Thông tin thú cưng
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-[#8a7e75]">Tên:</span><strong>{petNameInput}</strong></div>
                      <div className="flex justify-between"><span className="text-[#8a7e75]">Giống loài:</span><strong>{petBreedInput}</strong></div>
                      <div className="flex justify-between"><span className="text-[#8a7e75]">Tuổi:</span><strong>{petAgeInput} tuổi</strong></div>
                      <div className="flex justify-between"><span className="text-[#8a7e75]">Cân nặng:</span><strong>{petWeightInput} kg</strong></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-3">
                    <h4 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                      <Bookmark size={16} className="text-[#a43e24]" /> Lưu ý đặc biệt
                    </h4>
                    <p className="text-xs text-[#5d605c] italic leading-relaxed">
                      {specialRequestInput || "Không có yêu cầu đặc biệt."}
                    </p>
                  </div>
                </div>

                {/* Danh sách dịch vụ bổ sung */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-4">
                  <h4 className="text-sm font-bold text-[#303330]">Dịch vụ bổ sung đã chọn</h4>
                  {selectedServicesList.length === 0 ? (
                    <p className="text-xs text-[#8a7e75]">Không chọn dịch vụ đi kèm nào.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedServicesList.map(s => (
                        <div key={s.id} className="flex justify-between items-center p-3 bg-[#faf9f6] rounded-xl text-xs">
                          <span className="font-bold text-[#303330]">{s.name}</span>
                          <span className="font-black text-[#a43e24]">{s.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Sidebar Tổng kết chi phí */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <h3 className="text-lg font-black text-[#303330]">Tổng kết chi phí</h3>
                  <div className="space-y-3 text-xs border-b border-[#e1e3df] pb-4">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Phòng ({nights} đêm)</span>
                      <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedServicesList.length > 0 && (
                      <div className="flex justify-between text-[#8a7e75]">
                        <span>Dịch vụ phụ trợ</span>
                        <span className="font-bold text-[#303330]">{servicesCost.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thuế & Phí dịch vụ (10%)</span>
                      <span className="font-bold text-[#303330]">{taxAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-[#303330] text-sm">Tổng cộng</span>
                    <span className="text-xl font-black text-[#a43e24]">{beforeDiscount.toLocaleString('vi-VN')}đ</span>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={() => setStep(5)}
                      className="w-full bg-[#a43e24] text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#a43e24]/10"
                    >
                      Tiến tới thanh toán <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      className="w-full py-3.5 rounded-full border border-[#e1e3df] text-[#8a7e75] font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BƯỚC 5: THANH TOÁN ── */}
        {step === 5 && (
          <div>
            <header className="mb-12 text-left">
              <span className="text-[#44683b] font-semibold tracking-wider uppercase text-xs">Bước 5: Thanh Toán</span>
              <h1 className="text-4xl font-black text-[#303330] mt-1 mb-2">Hoàn tất thủ tục đặt phòng</h1>
              <p className="text-sm text-[#5d605c]">Vui lòng lựa chọn phương thức và quét mã chuyển khoản để hoàn tất.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-6">
                
                {/* Chọn phương thức thanh toán */}
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-left space-y-4">
                  <h3 className="text-sm font-bold text-[#303330] flex items-center gap-2">
                    <ShieldCheck size={18} className="text-[#a43e24]" /> Phương thức thanh toán
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'VIETQR', label: 'Chuyển khoản VietQR', desc: 'Quét mã để thanh toán nhanh chóng qua các App Ngân hàng' },
                      { id: 'MOMO',   label: 'Ví MoMo',        desc: 'Thanh toán trực tiếp qua ví điện tử MoMo' },
                      { id: 'VNPAY',  label: 'Cổng VNPay',     desc: 'Hỗ trợ thẻ nội địa ATM, thẻ quốc tế Visa/MasterCard, QR' },
                    ].map(method => (
                      <label
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                          paymentMethod === method.id
                            ? 'border-[#a43e24] bg-[#feeadb]/20 shadow-md'
                            : 'border-[#e1e3df] hover:border-[#a43e24]/30'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="text-xs font-bold text-[#303330]">{method.label}</p>
                          <p className="text-[10px] text-[#8a7e75] mt-0.5">{method.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === method.id ? 'border-[#a43e24]' : 'border-[#b1b2af]'
                        }`}>
                          {paymentMethod === method.id && (
                            <div className="w-2 h-2 rounded-full bg-[#a43e24]" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* QR Thanh Toán Trực Tiếp */}
                {paymentMethod === 'VIETQR' && (
                  <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] text-center space-y-4">
                    <span className="text-xs font-bold text-[#303330] block">Mã QR Thanh Toán</span>
                    <p className="text-[10px] text-[#8a7e75]">Vui lòng sử dụng ứng dụng Ngân hàng để quét mã bên dưới</p>
                    
                    <div className="bg-[#faf9f6] p-6 rounded-2xl border border-[#e5d8d0] inline-block">
                      <img
                        src={`https://img.vietqr.io/image/MB-0123456789-compact2.png?amount=${totalCost}&addInfo=DATPHONG&accountName=PETCARE%20HUB`}
                        alt="QR thanh toán"
                        className="w-48 h-48 mx-auto rounded-xl shadow-md border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto text-left text-xs pt-4">
                      <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#e5d8d0]">
                        <span className="text-[10px] text-[#8a7e75] block uppercase font-bold">Số tài khoản</span>
                        <strong className="text-[#303330] font-black">1234 5678 9012</strong>
                      </div>
                      <div className="bg-[#faf9f6] p-3 rounded-xl border border-[#e5d8d0]">
                        <span className="text-[10px] text-[#8a7e75] block uppercase font-bold">Ngân hàng</span>
                        <strong className="text-[#303330] font-black">MB Bank</strong>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Sidebar Tóm tắt hóa đơn cuối */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-3xl p-6 border border-[#e1e3df] space-y-6 text-left">
                  <h3 className="text-lg font-black text-[#303330]">Tóm tắt đơn hàng</h3>
                  <div className="space-y-3 text-xs border-b border-[#e1e3df] pb-4">
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Loại phòng</span>
                      <strong className="text-[#303330]">{activeRoom.name}</strong>
                    </div>
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thời gian</span>
                      <strong className="text-[#303330]">{nights} đêm | 1 thú cưng</strong>
                    </div>
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Chi phí lưu trú</span>
                      <span className="font-bold text-[#303330]">{roomCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                    {selectedServicesList.length > 0 && (
                      <div className="flex justify-between text-[#8a7e75]">
                        <span>Dịch vụ phụ trợ</span>
                        <span className="font-bold text-[#303330]">{servicesCost.toLocaleString('vi-VN')}đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#8a7e75]">
                      <span>Thuế & Phí dịch vụ (10%)</span>
                      <span className="font-bold text-[#303330]">{taxAmount.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  {/* Nhập mã giảm giá */}
                  <div className="pt-2">
                    <label className="block text-[10px] font-bold text-[#8a7e75] mb-2 uppercase">Mã giảm giá</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Nhập mã (SANCTUARY20)"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-grow rounded-xl border border-[#e1e3df] px-4 py-2 text-xs outline-none"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-[#2c4e24] text-white px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shrink-0"
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

                  <div className="space-y-1 text-xs border-t border-[#e1e3df] pt-4">
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-[#44683b] font-bold">
                        <span>Giảm giá voucher ({discountPercent}%)</span>
                        <span>-{discountAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-bold text-[#303330] text-sm">Tổng thanh toán</span>
                      <span className="text-xl font-black text-[#a43e24]">{totalCost.toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <button 
                      onClick={handleCreateBooking}
                      disabled={bookingLoading}
                      className="w-full bg-[#a43e24] text-white py-4 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#a43e24]/10 disabled:opacity-50"
                    >
                      {bookingLoading ? 'Đang tạo lịch...' : 'Thanh Toán Ngay'} <ArrowRight size={14} />
                    </button>
                    <button 
                      onClick={() => setStep(4)}
                      className="w-full py-3.5 rounded-full border border-[#e1e3df] text-[#8a7e75] font-bold text-xs uppercase tracking-wider hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
