import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  Star,
  Search,
  Check,
  MapPin,
  PawPrint
} from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { Header } from '@/components/Header'
import { cleanAddressDisplay } from '@/utils/cleanAddress'


interface HotelType {
  id: string
  name: string
  address: string | null
  distance?: string
  area?: string
  rating?: number
  totalReviews?: number
  price?: number
  tags?: string[]
  image?: string
  imageUrls?: string[]
  isPopular?: boolean
  amenities?: string[]
}

const DEFAULT_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800'
]

const HotelCardImage = ({ images, name }: { images: string[]; name: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!images || images.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [images])

  if (!images || images.length === 0) return null

  return (
    <img
      className="w-full h-full object-cover transition-all duration-1000 ease-in-out transform scale-100 group-hover:scale-103"
      src={images[currentIndex]}
      alt={`${name}-${currentIndex}`}
    />
  )
}

export const HotelListPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [loading, setLoading] = useState(true)

  // State bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [petType, setPetType] = useState<string | null>(null) // DOG, CAT, SMALL
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  useEffect(() => {
    if (location.state) {
      if (location.state.petType) {
        setPetType(location.state.petType)
      }
      if (location.state.searchQuery) {
        setSearchQuery(location.state.searchQuery)
      }
    }
  }, [location.state])


  const fetchNearbyHotels = async () => {
    setLoading(true)
    try {
      const response = await axiosInstance.get('/api/hotels/nearby')
      
      if (response.data && response.data.length > 0) {
        const list = response.data.map((h: any, idx: number) => ({
          id: h.id,
          name: h.name,
          address: h.address || 'Hồ Chí Minh, Việt Nam',
          rating: h.averageRating || null,
          totalReviews: h.totalReviews || 0,
          price: h.minPrice || undefined,
          tags: h.allowedPetTypes || [],
          image: (h.imageUrls && h.imageUrls.length > 0)
            ? h.imageUrls[0]
            : DEFAULT_HOTEL_IMAGES[idx % DEFAULT_HOTEL_IMAGES.length],
          imageUrls: (h.imageUrls && h.imageUrls.length > 0)
            ? h.imageUrls
            : [DEFAULT_HOTEL_IMAGES[idx % DEFAULT_HOTEL_IMAGES.length]],
          isPopular: (h.averageRating && h.averageRating >= 4.8 && h.totalReviews > 5) || false,
          amenities: h.amenities || []
        }))
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

  useEffect(() => {
    fetchNearbyHotels()
  }, [])

  const handleToggleAmenity = (name: string) => {
    if (selectedAmenities.includes(name)) {
      setSelectedAmenities(selectedAmenities.filter(a => a !== name))
    } else {
      setSelectedAmenities([...selectedAmenities, name])
    }
  }

  // Lọc kết quả tìm kiếm
  const filteredHotels = hotels.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.address || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    // Lọc theo petType
    let matchesPet = true
    if (petType === 'DOG') {
      matchesPet = h.tags?.some(t => t.toLowerCase().includes('dog') || t.toLowerCase().includes('chó') || t.toLowerCase().includes('golden') || t.toLowerCase().includes('husky')) ?? false
    } else if (petType === 'CAT') {
      matchesPet = h.tags?.some(t => t.toLowerCase().includes('cat') || t.toLowerCase().includes('mèo') || t.toLowerCase().includes('british') || t.toLowerCase().includes('ragdoll')) ?? false
    } else if (petType === 'SMALL') {
      matchesPet = h.tags?.some(t => t.toLowerCase().includes('small') || t.toLowerCase().includes('thỏ') || t.toLowerCase().includes('hamster') || t.toLowerCase().includes('nhỏ')) ?? false
    }

    // Lọc theo tiện nghi
    let matchesAmenities = true
    if (selectedAmenities.length > 0) {
      matchesAmenities = selectedAmenities.every(a => {
        if (a === 'Camera 24/7') {
          return h.amenities?.includes('Camera 24/7') || h.amenities?.includes('Đệm ngủ cao cấp')
        }
        return h.amenities?.includes(a)
      })
    }

    return matchesSearch && matchesPet && matchesAmenities
  })

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#faf9f6] text-[#303330] selection:bg-[#ffac98] selection:text-[#751c05] pb-24">
      
      {/* HEADER */}
      <Header />

      {/* SEARCH BANNER WRAPPER */}
      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 px-8 py-10 w-full text-left">
        
        {/* SIDEBAR BỘ LỌC CỰC KỲ ĐẸP MẮT */}
        <aside className="w-full lg:w-[320px] flex flex-col gap-6 p-6 bg-white rounded-3xl border border-[#e5d8d0] shadow-sm shrink-0 self-start sticky top-24">
          <div>
            <h2 className="text-2xl font-black text-[#303330]">Bộ Lọc Tìm Kiếm</h2>
            <p className="text-xs text-[#8a7e75] mt-1">Lọc theo sở thích của bạn</p>
          </div>

          {/* Loại thú cưng */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#303330]">Loại Thú Cưng</h3>
            <div className="space-y-2">
              {[
                { id: 'DOG', label: 'Chó' },
                { id: 'CAT', label: 'Mèo' },
                { id: 'SMALL', label: 'Thú nhỏ' }
              ].map(item => {
                const isActive = petType === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setPetType(isActive ? null : item.id)}
                    className={`w-full flex items-center rounded-2xl px-5 py-3.5 font-bold text-xs transition-all duration-300 border ${
                      isActive 
                        ? 'bg-[#a43e24] text-white border-[#a43e24] shadow-md shadow-[#a43e24]/10' 
                        : 'bg-[#faf9f6] border-[#e1e3df] text-[#8a7e75] hover:border-[#a43e24]/30'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tiện nghi */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#303330]">Tiện Nghi</h3>
            <div className="space-y-3">
              {[
                { id: 'Private Garden', label: 'Sân vườn riêng' },
                { id: 'Điều hòa (AC)', label: 'Điều hòa nhiệt độ' },
                { id: 'Camera 24/7', label: 'Camera 24/7' }
              ].map(amenity => {
                const isChecked = selectedAmenities.includes(amenity.id)
                return (
                  <label
                    key={amenity.id}
                    onClick={() => handleToggleAmenity(amenity.id)}
                    className="flex items-center gap-3 cursor-pointer text-xs font-bold text-[#5d605c] hover:text-[#303330] transition-colors"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      isChecked ? 'bg-[#a43e24] border-[#a43e24] text-white' : 'border-[#b1b2af] bg-[#faf9f6]'
                    }`}>
                      {isChecked && <Check size={10} strokeWidth={4} />}
                    </div>
                    <span>{amenity.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Xóa bộ lọc */}
          <div className="pt-4 border-t border-[#e1e3df] text-center">
            <button
              onClick={() => {
                setSearchQuery('')
                setPetType(null)
                setSelectedAmenities([])
              }}
              className="text-xs font-bold text-[#a43e24] hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        </aside>

        {/* CỘT PHẢI: CHI TIẾT DANH SÁCH KHÁCH SẠN */}
        <section className="flex-grow space-y-8">
          
          {/* Header & Tiêu đề kèm Thanh tìm kiếm */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#e1e3df] pb-6">
            <div className="space-y-2 min-w-0">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#303330] leading-tight">
                Tìm kiếm thiên đường nghỉ dưỡng
              </h1>
              <p className="text-[#8a7e75] text-xs sm:text-sm">
                Khám phá không gian ấm cúng, đầy đủ tiện nghi dành riêng cho người bạn bốn chân.
              </p>
            </div>
            
            {/* Search Input Container */}
            <div className="shrink-0 w-full sm:w-auto">
              <div className="relative flex items-center bg-white border border-[#e1e3df] rounded-full pl-4 pr-3 py-2 w-full sm:w-80 shadow-sm transition-all focus-within:border-[#a43e24] focus-within:shadow-[0_4px_20px_rgba(164,62,36,0.06)] focus-within:ring-2 focus-within:ring-[#a43e24]/5">
                <Search size={14} className="text-[#8a7e75] mr-2.5 shrink-0" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên khách sạn..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-[#303330] placeholder-[#b1b2af] outline-none focus:ring-0 p-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="text-[10px] font-bold text-[#8a7e75] hover:text-[#a43e24] transition-colors ml-1"
                  >
                    Xóa
                  </button>
                )}
              </div>
            </div>
          </div>


          {/* Grid Resort Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-3xl overflow-hidden border border-[#e1e3df] p-6 space-y-4 animate-pulse">
                  <div className="h-52 bg-[#eeeeea] rounded-2xl w-full" />
                  <div className="h-6 bg-[#eeeeea] rounded w-2/3" />
                  <div className="h-4 bg-[#eeeeea] rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredHotels.length === 0 ? (
                <div className="md:col-span-2 text-center py-20 bg-white border border-[#e5d8d0] rounded-3xl p-8">
                  <PawPrint size={40} className="text-stone-300 mx-auto mb-4" />
                  <p className="text-[#a43e24] font-black text-sm">Không tìm thấy khách sạn phù hợp.</p>
                  <p className="text-xs text-[#8a7e75] mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc để xem thêm.</p>
                </div>
              ) : (
                filteredHotels.map(hotel => (
                  <div
                    key={hotel.id}
                    className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-[#e1e3df] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative h-60 overflow-hidden">
                      <HotelCardImage images={hotel.imageUrls || []} name={hotel.name} />
                      {/* Price Badge */}
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-[#a43e24] font-black text-xs shadow-sm border border-[#e1e3df]">
                        {hotel.price && hotel.price > 0 ? (
                          `${hotel.price.toLocaleString('vi-VN')}đ/đêm`
                        ) : (
                          'Chưa có phòng'
                        )}
                      </div>
                      {/* Area/Distance Badge if any */}
                      {hotel.amenities?.includes('Private Garden') && (
                        <div className="absolute top-4 left-4 bg-[#d0fac0] text-[#2c4e24] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">
                          Sân vườn riêng
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 flex-grow flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-[#303330] group-hover:text-[#a43e24] transition-colors line-clamp-1">
                              {hotel.name}
                            </h3>
                            <p className="text-[10px] text-[#8a7e75] flex items-center gap-1 mt-0.5 font-bold">
                              <MapPin size={10} className="text-[#a43e24]" /> {cleanAddressDisplay(hotel.address)}
                            </p>
                          </div>
                          {hotel.isPopular && (
                            <span className="bg-[#d0fac0] text-[#2c4e24] text-[9px] font-black tracking-widest px-3 py-1 rounded-full shrink-0 uppercase">
                              Phổ biến
                            </span>
                          )}
                        </div>

                        {/* Rating row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star size={12} fill="currentColor" />
                            <span className="text-xs font-black text-[#303330]">
                              {hotel.rating ? hotel.rating.toFixed(1) : '—'}
                            </span>
                          </div>
                          {hotel.rating && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              hotel.rating >= 4.5
                                ? 'bg-[#d0fac0] text-[#2c4e24]'
                                : hotel.rating >= 4.0
                                ? 'bg-[#e8f5e9] text-[#388e3c]'
                                : hotel.rating >= 3.0
                                ? 'bg-[#fff8e1] text-[#f57f17]'
                                : hotel.rating >= 2.0
                                ? 'bg-[#fff3e0] text-[#e65100]'
                                : 'bg-[#fce4ec] text-[#c62828]'
                            }`}>
                              {hotel.rating >= 4.5
                                ? 'Xuất sắc'
                                : hotel.rating >= 4.0
                                ? 'Tốt'
                                : hotel.rating >= 3.0
                                ? 'Khá'
                                : hotel.rating >= 2.0
                                ? 'Trung bình'
                                : 'Kém'}
                            </span>
                          )}
                          <span className="text-[10px] text-[#8a7e75] font-bold">
                            ({hotel.totalReviews || 0} đánh giá)
                          </span>
                        </div>

                        {/* Tags list */}
                        {hotel.tags && hotel.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {hotel.tags.map((tag, idx) => {
                              const tagVi = tag === 'Dogs' ? 'Chó' : tag === 'Cats' ? 'Mèo' : tag === 'Small Pets' ? 'Thú nhỏ' : tag === 'CAT' ? 'Mèo' : tag === 'DOG' ? 'Chó' : tag === 'DOG_SMALL' ? 'Chó & Thú nhỏ' : tag === 'CAT_SMALL' ? 'Mèo & Thú nhỏ' : tag
                              return (
                                <span key={idx} className="bg-[#feeadb]/60 text-[#a43e24] px-3 py-1 rounded-full text-[10px] font-bold">
                                  {tagVi}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action buttons row */}
                      <div className="flex gap-3 pt-6 border-t border-dashed border-[#e1e3df] mt-6">
                        <button
                          onClick={() => navigate(`/hotels/${hotel.id}`)}
                          className="flex-1 py-2.5 rounded-full border border-[#e1e3df] text-[#5d605c] font-bold text-xs hover:bg-[#faf9f6] transition-all text-center"
                        >
                          Chi tiết
                        </button>
                        <button
                          onClick={() => {
                            if (!user) {
                              navigate('/login', { state: { from: `/hotels/${hotel.id}` } })
                            } else {
                              navigate(`/hotels/${hotel.id}`)
                            }
                          }}
                          className="flex-1 py-2.5 rounded-full bg-[#a43e24] text-white font-bold text-xs hover:opacity-90 shadow-md shadow-[#a43e24]/10 transition-all text-center"
                        >
                          Đặt ngay
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* BENTO SPECIAL LUXURY BANNER */}
          <div className="bg-[#c2ebb2]/40 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative border border-[#c2ebb2]/50 text-left">
            <div className="z-10 flex-grow space-y-4 max-w-xl">
              <span className="bg-[#3e6135] text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Đặc quyền cao cấp
              </span>
              <h2 className="text-3xl font-black text-[#2c4e24] leading-tight">
                Gói Chăm Sóc Cao Cấp
              </h2>
              <p className="text-[#3e6135] text-xs leading-relaxed font-bold">
                Tặng ngay liệu trình Spa và Massage thư giãn khi đặt phòng Suite từ 3 đêm trở lên.
              </p>
              <button className="bg-[#2c4e24] text-white px-6 py-3 rounded-full font-bold text-xs hover:bg-[#3e6135] transition-all shadow-md shadow-[#2c4e24]/10">
                Khám phá ngay
              </button>
            </div>
            <div className="relative z-10 w-full md:w-80 aspect-[4/3] md:aspect-square overflow-hidden rounded-2xl shrink-0 shadow-lg border-2 border-white">
              <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=600"
                alt="spa massage"
              />
            </div>
          </div>

        </section>

      </main>
    </div>
  )
}
