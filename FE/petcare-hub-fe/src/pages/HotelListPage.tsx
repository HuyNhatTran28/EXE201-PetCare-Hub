import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  Compass,
  Smile
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

import { Header } from '@/components/Header'

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

export const HotelListPage = () => {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [loading, setLoading] = useState(true)

  // State bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [petType, setPetType] = useState<string | null>(null) // null, DOG, CAT

  const fetchNearbyHotels = async (lat?: number, lng?: number) => {
    setLoading(true)
    try {
      const response = await axiosInstance.get('/api/hotels/nearby', {
        params: {
          lat,
          lng,
          radius: lat && lng ? 50 : undefined
        }
      })
      
      if (response.data && response.data.length > 0) {
        let list = response.data.map((h: any) => ({
          id: h.id,
          name: h.name,
          address: h.address || 'Hồ Chí Minh, Việt Nam',
          distance: lat && lng ? '— km' : 'Mặc định',
          area: 'Trung tâm',
          rating: h.averageRating || 0,
          price: h.minPrice || 0,
          tags: h.allowedPetTypes || [],
          image: (h.images && h.images.length > 0)
            ? h.images[0]
            : 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
          isLuxury: false
        }))

        // Lọc petType ở FE thay vì BE
        if (petType) {
          list = list.filter((h: any) => 
            !h.tags || 
            h.tags.length === 0 || 
            h.tags.includes(petType)
          )
        }

        setHotels(list)
      } else {
        setHotels([])
      }
    } catch (error) {
      console.error('Failed to fetch hotels', error)
      setHotels([])
    } finally {
      setLoading(false)
    }
  }

  // Load mặc định tất cả khách sạn khi mới vào trang (không truyền GPS)
  useEffect(() => {
    fetchNearbyHotels()
  }, [])

  // Chỉ chạy filter khi petType thay đổi dựa trên list khách sạn hiện có
  useEffect(() => {
    fetchNearbyHotels()
  }, [petType])

  const handleSmartSearch = () => {
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchNearbyHotels(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        alert("Không thể truy cập định vị GPS. Hệ thống sẽ sử dụng vị trí trung tâm TP. HCM để tìm kiếm thông minh!");
        fetchNearbyHotels(10.7769, 106.7009)
      }
    )
  }

  // Lọc cục bộ dựa trên tìm kiếm từ khóa
  const filteredHotels = hotels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.address || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Style helpers
  const sunlightShadow = { boxShadow: '0 20px 40px rgba(48, 51, 48, 0.06)' }
  const primaryGradient = { background: 'linear-gradient(135deg, #a43e24 0%, #fa7150 100%)' }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#faf9f6] text-[#303330] selection:bg-[#ffac98] selection:text-[#751c05] pb-24">

      {/* ── HEADER ── */}
      <Header />

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
                onClick={() => setPetType(petType === 'DOG' ? null : 'DOG')}
                className={`flex items-center gap-3 rounded-full px-6 py-3 font-bold hover:translate-x-1 duration-200 transition-all ${petType === 'DOG'
                    ? 'bg-white text-[#a43e24] shadow-sm'
                    : 'text-[#44683b] hover:bg-[#e8e8e4]'
                  }`}
              >
                <Compass size={18} />
                <span>Dogs</span>
              </button>
              <button
                onClick={() => setPetType(petType === 'CAT' ? null : 'CAT')}
                className={`flex items-center gap-3 rounded-full px-6 py-3 font-bold hover:translate-x-1 duration-200 transition-all ${petType === 'CAT'
                    ? 'bg-white text-[#a43e24] shadow-sm'
                    : 'text-[#44683b] hover:bg-[#e8e8e4]'
                  }`}
              >
                <Smile size={18} />
                <span>Cats</span>
              </button>
            </div>
          </div>

          {/* Nút Tìm kiếm thông minh */}
          <button
            onClick={handleSmartSearch}
            style={primaryGradient}
            className="w-full py-3.5 px-6 rounded-full text-[#fff7f6] font-bold text-xs shadow-lg shadow-[#a43e24]/10 hover:scale-[1.02] active:scale-95 transition-all text-center mt-6 cursor-pointer"
          >
            Tìm kiếm thông minh
          </button>

          <button
            onClick={() => {
              setSearchQuery('')
              setPetType(null)
            }}
            className="mt-4 text-[#a43e24] text-xs font-bold hover:underline text-center w-full cursor-pointer"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#e1e3df] p-8 space-y-4 animate-pulse text-left" style={sunlightShadow}>
                  <div className="h-48 bg-[#eeeeea] rounded-xl w-full"></div>
                  <div className="space-y-3">
                    <div className="h-6 bg-[#eeeeea] rounded w-2/3"></div>
                    <div className="h-4 bg-[#eeeeea] rounded w-1/3"></div>
                  </div>
                  <div className="pt-4 flex gap-3 border-t border-[#b1b2af]/10 mt-auto">
                    <div className="h-10 bg-[#eeeeea] rounded-full flex-grow"></div>
                    <div className="h-10 bg-[#eeeeea] rounded-full flex-grow"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {!loading && filteredHotels.length === 0 && (
                <div className="lg:col-span-3 text-center py-20">
                  <p className="text-[#a43e24] font-bold">
                    Không tìm thấy khách sạn phù hợp trong khu vực của bạn.
                  </p>
                  <p className="text-[#5d605c] text-sm mt-2">
                    Thử mở rộng bán kính tìm kiếm hoặc thay đổi bộ lọc.
                  </p>
                </div>
              )}
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
                        {(hotel.price ?? 0).toLocaleString('vi-VN')}đ/đêm
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
