import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Heart,
  Star,
  MapPin,
  SlidersHorizontal,
  ChevronDown,
  Navigation,
  RefreshCw,
  MessageSquare,
  Plus,
  Minus,
  X,
  Compass,
  Sparkles,
  ArrowRight,
  PawPrint
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

interface HotelType {
  id: string
  name: string
  address: string | null
  distance?: string
  area?: string
  rating?: number
  price?: number
  tags?: string[]
  image?: string
  lat?: number
  lng?: number
  isLuxury?: boolean
}

// Fallback Mock Data Khách Sạn
const MOCK_HOTELS = [
  {
    id: '9472cf9d-d27b-42dc-8361-f1e10b2a1084',
    name: 'Nemo Pet Resort',
    address: 'Đường Nguyễn Thị Minh Khai, Quận 1, TP. HCM',
    distance: '1.2 km',
    area: 'Quận 1',
    rating: 4.9,
    price: 250000,
    tags: ['Chuyên cho Mèo', 'Y tế 24/7', 'Camera 24/7'],
    image: 'https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?auto=format&fit=crop&q=80&w=600',
    lat: 10.776,
    lng: 106.696,
    isLuxury: true
  },
  {
    id: '2',
    name: 'Bark & Breakfast - Resort Sân Vườn',
    address: 'Đường Thảo Điền, Quận 2, TP. Thủ Đức',
    distance: '2.5 km',
    area: 'Thảo Điền',
    rating: 4.7,
    price: 620000,
    tags: ['Sân chơi rộng', 'Ưu tiên chó lớn', 'Spa & Tắm'],
    image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=600',
    lat: 10.803,
    lng: 106.731,
    isLuxury: false
  }
]

export const HotelListPage = () => {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [loading, setLoading] = useState(true)

  // State bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [petType, setPetType] = useState('DOG') // DOG, CAT, SMALL
  const [priceRange, setPriceRange] = useState(1500000)
  const [roomType, setRoomType] = useState('ALL')
  const [suitability, setSuitability] = useState('ANY')

  // Khách sạn đang được chọn trên bản đồ / danh sách
  const [selectedHotel, setSelectedHotel] = useState<HotelType | null>(null)

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const response = await axiosInstance.get('/api/hotels?status=ACTIVE')
        if (response.data && response.data.content && response.data.content.length > 0) {
          const list = response.data.content.map((h: any) => ({
            id: h.id,
            name: h.name,
            address: h.address || 'Hồ Chí Minh, Việt Nam',
            distance: '1.5 km',
            area: 'Trung tâm',
            rating: h.averageRating || 5.0,
            price: 250000,
            tags: h.amenities || ['Y tế 24/7', 'Camera 24/7'],
            image: h.images && h.images.length > 0 ? h.images[0] : 'https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?auto=format&fit=crop&q=80&w=600',
            lat: h.locationLat || 10.776,
            lng: h.locationLong || 106.696,
            isLuxury: true
          }))
          setHotels(list)
          setSelectedHotel(list[0])
        } else {
          setHotels(MOCK_HOTELS)
          setSelectedHotel(MOCK_HOTELS[0])
        }
      } catch (error) {
        console.error('Failed to fetch hotels', error)
        setHotels(MOCK_HOTELS)
        setSelectedHotel(MOCK_HOTELS[0])
      } finally {
        setLoading(false)
      }
    }
    fetchHotels()
  }, [])

  return (
    <div className="h-screen flex flex-col font-sans overflow-hidden bg-[#faf9f6] selection:bg-[#fa7150] selection:text-white">
      
      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/95 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20 shrink-0">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <PawPrint size={26} className="text-[#fa7150]" />
            <span className="text-lg font-extrabold tracking-tight text-[#303330]">
              Pet Sanctuary
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">Trang chủ</Link>
            <Link to="/hotels" className="text-sm font-semibold text-[#fa7150] border-b-2 border-[#fa7150] pb-1 transition-all duration-300">Khách sạn</Link>
            <Link to="/my-bookings" className="text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">Nhật ký</Link>
            <Link to="/profile" className="text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">Tài khoản</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-lg shadow-[#fa7150]/20 hover:shadow-[#fa7150]/40 transition-all hover:scale-[1.02] cursor-pointer"
            style={{ backgroundColor: '#a43e24' }}
          >
            Quay về Trang chủ
          </button>
        </div>
      </header>

      {/* ── BẢN ĐỒ & DANH SÁCH KHÁCH SẠN ─────────────────────────── */}
      <main className="flex-grow flex overflow-hidden">
        
        {/* SIDEBAR BỘ LỌC & DANH SÁCH (Bên Trái) */}
        <aside className="w-full md:w-[450px] lg:w-[500px] h-full flex flex-col bg-white border-r border-[#e5d8d0] shrink-0">
          
          {/* Bộ lọc tìm kiếm cấp cao */}
          <div className="p-6 space-y-6 bg-[#fdfaf8] border-b border-[#e5d8d0] shrink-0">
            
            {/* Input Search */}
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a7e75]" />
              <input 
                type="text" 
                placeholder="Tìm khách sạn gần bạn..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-[#e5d8d0] rounded-2xl text-sm outline-none focus:border-[#fa7150] focus:ring-1 focus:ring-[#fa7150] transition-all"
              />
            </div>

            {/* Lọc loại thú cưng */}
            <div className="space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#8a7e75]">Loại thú cưng nhận gửi</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPetType('DOG')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    petType === 'DOG' 
                      ? 'bg-[#fa7150] text-white shadow-md shadow-[#fa7150]/20' 
                      : 'bg-white border border-[#e5d8d0] text-[#5a5550] hover:bg-[#fbf7f4]'
                  }`}
                >
                  Chó cưng
                </button>
                <button 
                  onClick={() => setPetType('CAT')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    petType === 'CAT' 
                      ? 'bg-[#fa7150] text-white shadow-md shadow-[#fa7150]/20' 
                      : 'bg-white border border-[#e5d8d0] text-[#5a5550] hover:bg-[#fbf7f4]'
                  }`}
                >
                  Mèo cưng
                </button>
                <button 
                  onClick={() => setPetType('SMALL')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    petType === 'SMALL' 
                      ? 'bg-[#fa7150] text-white shadow-md shadow-[#fa7150]/20' 
                      : 'bg-white border border-[#e5d8d0] text-[#5a5550] hover:bg-[#fbf7f4]'
                  }`}
                >
                  Thú cưng nhỏ
                </button>
              </div>
            </div>

            {/* Lọc khoảng giá */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-black uppercase tracking-wider text-[#8a7e75]">Ngân sách / Đêm</label>
                <span className="font-extrabold text-[#a43e24]">{priceRange.toLocaleString('vi-VN')} đ</span>
              </div>
              <input 
                type="range" 
                min="300000" 
                max="3000000" 
                step="50000" 
                value={priceRange} 
                onChange={(e) => setPriceRange(Number(e.target.value))}
                className="w-full accent-[#fa7150] cursor-pointer"
              />
            </div>

            {/* Dropdowns tùy chọn thêm */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#8a7e75] mb-2">Hạng phòng</label>
                <div className="relative">
                  <select 
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5d8d0] rounded-xl text-xs font-bold text-[#303330] outline-none appearance-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả hạng phòng</option>
                    <option value="STD">Tiêu chuẩn (Standard)</option>
                    <option value="DLX">Sân vườn (Deluxe)</option>
                    <option value="VIP">Dinh thự Hoàng gia (VIP)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7e75] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#8a7e75] mb-2">Tính năng đặc biệt</label>
                <div className="relative">
                  <select 
                    value={suitability}
                    onChange={(e) => setSuitability(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5d8d0] rounded-xl text-xs font-bold text-[#303330] outline-none appearance-none cursor-pointer"
                  >
                    <option value="ANY">Không yêu cầu</option>
                    <option value="CAM">Có Live Webcam 24/7</option>
                    <option value="MED">Có hỗ trợ uống thuốc</option>
                    <option value="PLAY">Sân chơi ngoài trời rộng</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7e75] pointer-events-none" />
                </div>
              </div>
            </div>

          </div>

          {/* Danh sách Khách sạn hiển thị bên dưới bộ lọc */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-orange-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-[#303330]">Khách sạn sẵn có gần bạn</h2>
              <span className="text-xs font-bold text-[#fa7150] bg-[#fdf0ec] px-2.5 py-1 rounded-full">{hotels.length} kết quả gần nhất</span>
            </div>

            {hotels.map((hotel) => (
              <div 
                key={hotel.id}
                onClick={() => setSelectedHotel(hotel)}
                className={`group cursor-pointer bg-white rounded-3xl overflow-hidden border transition-all duration-300 ${
                  selectedHotel?.id === hotel.id 
                    ? 'border-[#fa7150] shadow-xl shadow-[#fa7150]/5 bg-[#fdfcfb]' 
                    : 'border-[#e5d8d0] hover:border-[#fa7150]/50 hover:shadow-lg'
                }`}
              >
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img 
                    src={hotel.image} 
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  />
                  {hotel.isLuxury && (
                    <span className="absolute top-4 left-4 bg-[#a43e24] text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                      Hạng Sang (Luxury)
                    </span>
                  )}
                  <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-all">
                    <Heart size={16} />
                  </button>
                </div>
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-bold text-base text-[#303330] group-hover:text-[#fa7150] transition-colors line-clamp-1">{hotel.name}</h3>
                    <div className="flex items-center gap-1 bg-[#fff0e6] text-[#fa7150] px-2 py-0.5 rounded-lg text-xs font-bold shrink-0">
                      <Star size={12} fill="currentColor" /> {hotel.rating}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-[#8a7e75] mb-4">
                    <MapPin size={12} className="text-[#fa7150]" /> Cách {hotel.distance} • <span className="font-bold text-[#5a5550]">{hotel.area}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(hotel.tags || []).map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-[#f5ede8] text-[#8a7e75] rounded-lg text-[9px] font-bold uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[#e5d8d0]/60">
                    <span className="text-[10px] font-bold text-[#8a7e75] uppercase">Đánh giá tốt nhất</span>
                    <div className="text-right">
                      <span className="text-xl font-black text-[#a43e24]">{(hotel.price || 250000).toLocaleString('vi-VN')} đ</span>
                      <span className="text-[10px] text-[#8a7e75] block mt-0.5">/đêm</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </aside>

        {/* BẢN ĐỒ MÔ PHỎNG CHI TIẾT (Bên Phải) */}
        <section className="hidden md:block flex-grow relative bg-[#eae4dd] overflow-hidden">
          
          {/* Map Image Background */}
          <div className="absolute inset-0 grayscale-[0.2] opacity-90">
            <img 
              src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1500" 
              alt="Bản đồ định vị" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Vùng quét tìm kiếm bán kính */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] border-4 border-[#fa7150]/20 rounded-full bg-[#fa7150]/5 pointer-events-none animate-pulse" />

          {/* Markers giá tiền sinh động */}
          {hotels.map((hotel) => {
            const isSelected = selectedHotel?.id === hotel.id
            return (
              <div 
                key={hotel.id}
                onClick={() => setSelectedHotel(hotel)}
                className="absolute transition-all duration-300"
                style={{
                  top: hotel.id === '1' ? '42%' : hotel.id === '2' ? '28%' : hotel.id === '3' ? '65%' : '52%',
                  left: hotel.id === '1' ? '45%' : hotel.id === '2' ? '68%' : hotel.id === '3' ? '52%' : '28%'
                }}
              >
                <div className="relative flex flex-col items-center group cursor-pointer">
                  <div className={`font-black px-3.5 py-1.5 rounded-full text-xs shadow-xl transition-all ${
                    isSelected 
                      ? 'bg-[#fa7150] text-white scale-110 shadow-[#fa7150]/30 z-20' 
                      : 'bg-white text-[#303330] border border-[#e5d8d0] hover:bg-[#fa7150] hover:text-white'
                  }`}>
                    {(hotel.price / 1000).toLocaleString('vi-VN')}k
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 border-white mt-1 shadow-md transition-colors ${
                    isSelected ? 'bg-[#fa7150] scale-110' : 'bg-[#a43e24]'
                  }`} />
                </div>
              </div>
            )
          })}

          {/* Nút Phóng to / Thu nhỏ & Định vị bản đồ */}
          <div className="absolute top-8 right-8 flex flex-col gap-2">
            <button className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center text-[#303330] shadow-md hover:bg-[#fa7150] hover:text-white transition-colors cursor-pointer">
              <span className="font-bold text-lg">+</span>
            </button>
            <button className="w-10 h-10 bg-white/95 backdrop-blur-md rounded-2xl flex items-center justify-center text-[#303330] shadow-md hover:bg-[#fa7150] hover:text-white transition-colors cursor-pointer">
              <span className="font-bold text-lg">-</span>
            </button>
            <button className="w-10 h-10 bg-[#fa7150] text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer mt-2">
              <Navigation size={16} />
            </button>
          </div>

          {/* Hộp thoại thông tin khách sạn đang chọn (Floating Tooltip Overlay) */}
          {selectedHotel && (
            <div className="absolute top-8 left-8 max-w-sm w-full bg-white/95 backdrop-blur-xl p-4 rounded-3xl shadow-2xl border border-[#e5d8d0]/60 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-inner">
                <img 
                  src={selectedHotel.image} 
                  alt={selectedHotel.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow text-left">
                <p className="font-bold text-sm text-[#303330] line-clamp-1">{selectedHotel.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-black text-[#a43e24]">{selectedHotel.price.toLocaleString('vi-VN')} đ/đêm</span>
                  <span className="text-[10px] text-[#8a7e75]">•</span>
                  <span className="text-[10px] font-bold uppercase text-[#fa7150]">{selectedHotel.distance}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHotel(null)}
                className="p-1.5 hover:bg-[#fbf7f4] rounded-full text-[#8a7e75] hover:text-[#fa7150] transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Nút Quét lại khu vực */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
            <button className="bg-[#1e392a] text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer">
              <RefreshCw size={14} className="animate-spin-slow" /> Quét lại khu vực này
            </button>
          </div>

        </section>

      </main>

      {/* NÚT HOÀN THÀNH CHỌN KHÁCH SẠN */}
      {selectedHotel && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
          <div className="bg-white/95 backdrop-blur-md px-6 py-3.5 rounded-full shadow-2xl border border-[#e5d8d0] hidden sm:flex items-center gap-2">
            <Sparkles size={16} className="text-[#fa7150]" />
            <span className="text-xs font-bold text-[#5a5550]">Bạn đang chọn: <strong className="text-[#303330]">{selectedHotel.name}</strong></span>
          </div>
          <button 
            onClick={() => navigate(`/hotels/${selectedHotel.id}`)}
            className="bg-[#fa7150] text-white px-8 py-3.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-2xl shadow-[#fa7150]/20 hover:bg-[#fa7150]/90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            Xem phòng chi tiết <ArrowRight size={14} />
          </button>
        </div>
      )}

    </div>
  )
}
