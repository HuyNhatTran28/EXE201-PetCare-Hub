import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search,
  Star,
  MapPin,
  Sparkles,
  ArrowRight,
  PawPrint,
  Compass,
  Smile
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
  isLuxury?: boolean
}

const MOCK_HOTELS = [
  {
    id: '9472cf9d-d27b-42dc-8361-f1e10b2a1084',
    name: 'Zen Cat Loft',
    address: 'Đường Nguyễn Thị Minh Khai, Quận 1, TP. HCM',
    distance: '1.2 km',
    area: 'Quận 1',
    rating: 4.9,
    price: 450000,
    tags: ['British Shorthair', 'Ragdoll'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABxHktaS5nJDegnqExeOW6p503wyn9bzBKpGpRONq3vzlD7vTHHoXFTA8rkiw5N8YzJJutiPToZgjVKhrPCsyQcr8DSf4nNIJ6r-dAyQF7ZBa9M5yOlScqcE587gqJrSYKeoOTi2VZOZUOEvzgzP0KEMMY3Ckq242HujjmnCsTa-67mD4ARtLF-_bbvb1e9lecXpqb3wTLbd64c924fz09-l3Y10tCNSTecVcKUWL10F_aOYLnMKdbytixsYS3g6AUCivjILTw_6MR',
    isLuxury: true
  },
  {
    id: '2',
    name: 'Deluxe Garden Suite',
    address: 'Đường Thảo Điền, Quận 2, TP. Thủ Đức',
    distance: '2.5 km',
    area: 'Thảo Điền',
    rating: 5.0,
    price: 750000,
    tags: ['Golden Retriever', 'Husky'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuARBsWtsWewrdsB2obZbAbXn2po_wK5odNt5ljTeTOTgg_D9sj6ZUEAz3zCqJCRhoZMvA00XKoksIAHg--Wb0Z7ReeeW2AQE2dcE05tK0Vt-pE7xSX1XIcdM9Prb7wFNcirJUNCZqaNr-gfY0muoA9YS47oPk0Vt9M0CcEMdf6AD5aZIDjAXcHwERyHZpD47emS1Tb8apI4CQ-Vy_buRVA9gBba03RTyFEdPssBD_rHNpnxzRAGRTZoTlNC0JKD6Fb_YfGyBfY_aUdw',
    isLuxury: false
  },
  {
    id: '3',
    name: 'Tiny Paws Studio',
    address: 'Đường Nguyễn Văn Linh, Quận 7, TP. HCM',
    distance: '3.8 km',
    area: 'Quận 7',
    rating: 4.8,
    price: 320000,
    tags: ['Thỏ', 'Hamster'],
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZmWA2PZNHDcMnZRFJsBw-wJ6XChRJqNatNPFw2WaJIGpHHSJAk0VUXTKVFj1WvQBGhFCg702Onwmnp7jBZo_XhpO9gAGpT0YyRrdoGhyR6euAPaMUG9H4350a1PkVwQE0_onyBbXNKjLQ5OlvvB5swKGF2R7Ep_U43q9MCsGto8zrv0uIoFvGvy0CrkHl97DtiTL-lufFxqGNYo8yr4JsVKXdp2i-Sz2IQXiT_yeN2ptxKkbhk5IiEP705LIvf5IUDviR9HIMRtWT',
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
  const [priceRange, setPriceRange] = useState(1000000)
  const [amenityGarden, setAmenityGarden] = useState(false)
  const [amenityAC, setAmenityAC] = useState(false)
  const [amenityBed, setAmenityBed] = useState(true)

  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true)
      try {
        // Gọi API tìm kiếm tổng hợp tích hợp bộ lọc
        // lat=10.77&lng=106.70&radius=10 là GPS Quận 1, HCMC mặc định
        const response = await axiosInstance.get('/api/hotels/search', {
          params: {
            lat: 10.77,
            lng: 106.70,
            radius: 10,
            petType: petType,
            minPrice: 0,
            maxPrice: priceRange
          }
        })
        
        if (response.data && response.data.length > 0) {
          const list = response.data.map((h: any) => ({
            id: h.id,
            name: h.name,
            address: h.address || 'Hồ Chí Minh, Việt Nam',
            distance: '1.2 km',
            area: 'Trung tâm',
            rating: h.averageRating || 4.9,
            price: h.price || 450000,
            tags: h.amenities || ['Y tế 24/7', 'Camera 24/7'],
            image: h.images && h.images.length > 0 ? h.images[0] : MOCK_HOTELS[0].image,
            isLuxury: true
          }))
          setHotels(list)
        } else {
          // Trả về mock data được lọc nếu API không trả về phần tử nào
          const filteredMock = MOCK_HOTELS.filter(h => h.price <= priceRange)
          setHotels(filteredMock)
        }
      } catch (error) {
        console.error('Failed to fetch hotels from search API, falling back to mock filters', error)
        const filteredMock = MOCK_HOTELS.filter(h => h.price <= priceRange)
        setHotels(filteredMock)
      } finally {
        setLoading(false)
      }
    }
    fetchHotels()
  }, [petType, priceRange])

  // Lọc cục bộ dựa trên tìm kiếm từ khóa
  const filteredHotels = hotels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (h.address || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Style helpers
  const sunlightShadow = { boxShadow: '0 20px 40px rgba(48, 51, 48, 0.06)' }
  const primaryGradient = { background: 'linear-gradient(135deg, #a43e24 0%, #ffac98 100%)' }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#faf9f6] text-[#303330] selection:bg-[#ffac98] selection:text-[#751c05] pb-24">
      
      {/* ── HEADER ── */}
      <nav className="w-full sticky top-0 z-50 bg-[#faf9f6] border-b border-[#e1e3df] shrink-0">
        <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto w-full">
          <div className="flex items-center gap-12">
            <Link to="/" className="text-2xl font-black text-[#a43e24] tracking-tight font-headline flex items-center gap-2">
              <PawPrint className="text-[#a43e24]" />
              The Pet Sanctuary
            </Link>
            <div className="hidden md:flex items-center gap-8 font-medium">
              <Link to="/hotels" className="text-[#a43e24] font-bold border-b-2 border-[#a43e24] pb-1">Tìm phòng</Link>
              <Link to="/pets" className="text-stone-600 hover:text-[#a43e24] transition-all">Nhật ký Thú cưng</Link>
              <span className="text-stone-600 cursor-default">Dịch vụ</span>
              <span className="text-stone-600 cursor-default">Về chúng tôi</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden lg:block">
              <input 
                className="bg-[#e8e8e4] border-none rounded-md py-2 px-4 pr-10 text-sm focus:ring-2 focus:ring-[#a43e24]/20 w-64 transition-all" 
                placeholder="Tìm kiếm phòng..." 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5d605c] w-4.5 h-4.5" />
            </div>
            <Link to="/partner/bookings" className="bg-[#a43e24] text-[#fff7f6] px-6 py-2 rounded-full font-medium transition-all hover:opacity-90 hover:scale-[1.02]">
              Lịch đặt phòng
            </Link>
          </div>
        </div>
      </nav>

      {/* ── BẢN ĐỒ & DANH SÁCH ── */}
      <main className="max-w-screen-2xl mx-auto flex gap-8 px-8 py-10 w-full">
        
        {/* SIDEBAR BỘ LỌC (Bên Trái) */}
        <aside className="hidden md:flex flex-col gap-6 p-8 bg-[#f4f4f0] rounded-3xl min-w-[280px] max-w-[280px] h-fit shadow-[20px_0_40px_rgba(48,51,48,0.06)] text-left">
          <div>
            <h2 className="text-xl font-headline font-bold text-[#303330]">Filter Sanctuary</h2>
            <p className="text-sm text-[#5d605c]">Tinh chỉnh tùy chọn</p>
          </div>

          {/* Loại thú cưng */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#44683b]">Loại Thú Cưng</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => setPetType('DOG')}
                className={`flex items-center gap-3 rounded-full px-6 py-3 font-bold hover:translate-x-1 duration-200 transition-all ${
                  petType === 'DOG' 
                    ? 'bg-white text-[#a43e24] shadow-sm' 
                    : 'text-[#44683b] hover:bg-[#e8e8e4]'
                }`}
              >
                <Compass size={18} />
                <span>Dogs</span>
              </button>
              <button 
                onClick={() => setPetType('CAT')}
                className={`flex items-center gap-3 rounded-full px-6 py-3 font-bold hover:translate-x-1 duration-200 transition-all ${
                  petType === 'CAT' 
                    ? 'bg-white text-[#a43e24] shadow-sm' 
                    : 'text-[#44683b] hover:bg-[#e8e8e4]'
                }`}
              >
                <Smile size={18} />
                <span>Cats</span>
              </button>
              <button 
                onClick={() => setPetType('SMALL')}
                className={`flex items-center gap-3 rounded-full px-6 py-3 font-bold hover:translate-x-1 duration-200 transition-all ${
                  petType === 'SMALL' 
                    ? 'bg-white text-[#a43e24] shadow-sm' 
                    : 'text-[#44683b] hover:bg-[#e8e8e4]'
                }`}
              >
                <Sparkles size={18} />
                <span>Small Pets</span>
              </button>
            </div>
          </div>

          {/* Khoảng giá */}
          <div className="pt-4 space-y-4 border-t border-[#b1b2af]/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#44683b]">Khoảng Giá (VND)</h3>
            <div className="px-2">
              <input 
                className="w-full h-2 bg-[#e1e3df] rounded-lg appearance-none cursor-pointer accent-[#a43e24]" 
                max="1000000" 
                min="0" 
                step="50000" 
                type="range"
                value={priceRange}
                onChange={(e) => setPriceRange(Number(e.target.value))}
              />
              <div className="flex justify-between mt-2 text-xs font-medium text-[#5d605c]">
                <span>0đ</span>
                <span className="text-[#a43e24] font-bold">{priceRange.toLocaleString('vi-VN')}đ</span>
                <span>1.000.000đ</span>
              </div>
            </div>
          </div>

          {/* Tiện nghi */}
          <div className="pt-4 space-y-4 border-t border-[#b1b2af]/20">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#44683b]">Tiện Nghi</h3>
            <div className="grid gap-3">
              <label className="flex items-center gap-3 group cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={amenityGarden} 
                  onChange={(e) => setAmenityGarden(e.target.checked)}
                  className="rounded border-[#b1b2af] text-[#a43e24] focus:ring-[#a43e24]/20"
                />
                <span className="text-sm text-[#5d605c] group-hover:text-[#a43e24] transition-colors">Private Garden</span>
              </label>
              <label className="flex items-center gap-3 group cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={amenityAC} 
                  onChange={(e) => setAmenityAC(e.target.checked)}
                  className="rounded border-[#b1b2af] text-[#a43e24] focus:ring-[#a43e24]/20"
                />
                <span className="text-sm text-[#5d605c] group-hover:text-[#a43e24] transition-colors">Điều hòa (AC)</span>
              </label>
              <label className="flex items-center gap-3 group cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={amenityBed} 
                  onChange={(e) => setAmenityBed(e.target.checked)}
                  className="rounded border-[#b1b2af] text-[#a43e24] focus:ring-[#a43e24]/20"
                />
                <span className="text-sm text-[#5d605c] group-hover:text-[#a43e24] transition-colors">Đệm ngủ cao cấp</span>
              </label>
            </div>
          </div>

          <button 
            onClick={() => {
              setSearchQuery('')
              setPriceRange(1000000)
              setAmenityGarden(false)
              setAmenityAC(false)
              setAmenityBed(true)
            }}
            className="mt-6 text-[#a43e24] text-xs font-bold hover:underline text-center w-full"
          >
            Clear All Filters
          </button>
        </aside>

        {/* DANH SÁCH RESORT/HOTEL */}
        <section className="flex-grow flex flex-col space-y-8">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-left">
            <div className="max-w-xl">
              <h1 className="text-4xl font-headline font-extrabold text-[#303330] tracking-tight mb-2">Tìm kiếm thiên đường nghỉ dưỡng</h1>
              <p className="text-[#5d605c] leading-relaxed text-sm">Khám phá những không gian riêng tư, ấm cúng và đầy đủ tiện nghi dành riêng cho người bạn bốn chân của bạn.</p>
            </div>
            <div className="flex items-center gap-4 bg-[#eeeeea] p-2 rounded-full px-6 text-xs font-bold text-[#44683b]">
              <span>Sắp xếp:</span>
              <select className="bg-transparent border-none text-xs font-bold text-[#303330] focus:ring-0 cursor-pointer p-0">
                <option>Gần nhất</option>
                <option>Giá thấp đến cao</option>
                <option>Đánh giá tốt nhất</option>
              </select>
            </div>
          </header>

          {/* Grid Resort Cards */}
          {loading ? (
            <div className="text-center py-20 font-bold text-[#a43e24]">Đang tải danh sách resort kết nối API...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredHotels.map((hotel) => {
                return (
                  <div 
                    key={hotel.id}
                    className="group relative flex flex-col bg-white rounded-2xl overflow-hidden transition-all duration-300 border border-[#e1e3df] hover:shadow-xl hover:-translate-y-1"
                    style={sunlightShadow}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        src={hotel.image}
                        alt={hotel.name}
                      />
                      <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-md px-4 py-1.5 rounded-full text-[#a43e24] font-black text-xs shadow-sm">
                        {hotel.price.toLocaleString('vi-VN')}đ/đêm
                      </div>
                    </div>
                    <div className="p-8 space-y-4 text-left flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-xl font-headline font-bold text-[#303330] group-hover:text-[#a43e24] transition-colors">{hotel.name}</h3>
                            <div className="flex items-center gap-1 mt-1 text-[#44683b]">
                              <Star size={14} fill="currentColor" />
                              <span className="text-xs font-bold">{hotel.rating}</span>
                              <span className="text-[10px] text-[#797b78]">(128 đánh giá)</span>
                            </div>
                          </div>
                          {hotel.isLuxury && (
                            <span className="bg-[#feeadb] text-[#63564b] text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full shrink-0">
                              Phổ biến
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {hotel.tags?.map((tag, idx) => (
                            <span key={idx} className="bg-[#feeadb] text-[#63564b] px-3 py-1 rounded-full text-[10px] font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 flex items-center gap-3 border-t border-[#b1b2af]/10 mt-auto">
                        <button 
                          onClick={() => navigate(`/hotels/${hotel.id}`)}
                          className="flex-grow py-3 px-6 rounded-full border border-[#b1b2af] text-[#5d605c] font-bold text-xs hover:bg-[#eeeeea] transition-all"
                        >
                          Chi tiết
                        </button>
                        <button 
                          onClick={() => navigate(`/hotels/${hotel.id}`)}
                          style={primaryGradient}
                          className="flex-grow py-3 px-6 rounded-full text-[#fff7f6] font-bold text-xs shadow-lg shadow-[#a43e24]/10 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                          Đặt ngay
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Bento Gói chăm sóc */}
              <div className="lg:col-span-3 bg-[#c2ebb2]/40 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative text-left">
                <div className="z-10 flex-grow space-y-4">
                  <span className="bg-[#3e6135] text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">Đặc quyền Premium</span>
                  <h2 className="text-3xl font-headline font-extrabold text-[#2c4e24] leading-tight">Gói Chăm Sóc 'Luxury Paw'</h2>
                  <p className="text-[#3e6135] text-sm">Tặng ngay liệu trình Spa và Massage thư giãn khi đặt phòng Suite từ 3 đêm trở lên.</p>
                  <button className="bg-[#2c4e24] text-white px-8 py-3 rounded-full font-bold text-xs hover:bg-[#3e6135] transition-all">Khám phá ngay</button>
                </div>
                <div className="relative z-10 w-full md:w-1/3 aspect-video overflow-hidden rounded-xl">
                  <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJ8PbA4iHhgZ4bsdHRHR9PyqR8SuVRS_QUB4UinmvV2BCXrJY8kv3-_PNLoULCKeYP2P1sebHrWdZ5oK6CWNC4RrYQNuyDS6iU54Ag6xYRWnyI2WNTX0k7iLtsCJFSDLJbod88YRkq6M05irG_D_Eskh6ga9YAI5Dyd3ULJhawA7z-xXB3IjD6WEyGKXGZ_A8memXcCA3Z1GWxNihajQAi9UyAThgX7YEGEUTl7QSt2AtkGFhBDkdG5aFzXftqymiUY9bVghwHww7I" alt="spa" />
                </div>
              </div>
            </div>
          )}
        </section>

      </main>

    </div>
  )
}
