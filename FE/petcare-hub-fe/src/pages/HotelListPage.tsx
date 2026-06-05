import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  PawPrint,
  Sparkles,
  ChevronDown,
  Search,
  Check,
  MapPin
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
  totalReviews?: number
  price?: number
  tags?: string[]
  image?: string
  isPopular?: boolean
  amenities?: string[]
}

const DEFAULT_HOTEL_IMAGES = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800'
]

export const HotelListPage = () => {
  const navigate = useNavigate()
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [loading, setLoading] = useState(true)

  // State bộ lọc tìm kiếm
  const [searchQuery, setSearchQuery] = useState('')
  const [petType, setPetType] = useState<string | null>(null) // DOG, CAT, SMALL
  const [priceRange, setPriceRange] = useState<number>(1000000)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

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
          price: h.minPrice || (300000 + (idx % 4) * 100000),
          tags: h.allowedPetTypes?.length > 0 ? h.allowedPetTypes : (idx % 2 === 0 ? ['Dogs', 'Cats'] : ['Small Pets']),
          image: (h.imageUrls && h.imageUrls.length > 0)
            ? h.imageUrls[0]
            : DEFAULT_HOTEL_IMAGES[idx % DEFAULT_HOTEL_IMAGES.length],
          isPopular: idx % 3 === 0,
          amenities: idx % 3 === 0 ? ['Đệm ngủ cao cấp'] : idx % 3 === 1 ? ['Private Garden'] : ['Điều hòa (AC)']
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

    // Lọc theo giá
    const matchesPrice = (h.price ?? 0) <= priceRange

    // Lọc theo tiện nghi
    let matchesAmenities = true
    if (selectedAmenities.length > 0) {
      matchesAmenities = selectedAmenities.every(a => h.amenities?.includes(a))
    }

    return matchesSearch && matchesPet && matchesPrice && matchesAmenities
  })

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#faf9f6] text-[#303330] selection:bg-[#ffac98] selection:text-[#751c05] pb-24">
      
      {/* HEADER */}
      <Header />

      {/* SEARCH BANNER WRAPPER */}
      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 px-8 py-10 w-full text-left">
        
        {/* SIDEBAR BỘ LỌC CỰC KỲ ĐẸP MẮT */}
        <aside className="w-full lg:w-[300px] flex flex-col gap-8 p-8 bg-white rounded-3xl border border-[#e5d8d0] shadow-sm shrink-0">
          <div>
            <h2 className="text-2xl font-black text-[#303330]">Filter Sanctuary</h2>
            <p className="text-xs text-[#8a7e75] mt-1">Refine by preference</p>
          </div>

          {/* Loại thú cưng */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#303330]">Loại Thú Cưng</h3>
            <div className="space-y-2">
              {[
                { id: 'DOG', label: 'Dogs', icon: <PawPrint size={16} /> },
                { id: 'CAT', label: 'Cats', icon: <Sparkles size={16} /> },
                { id: 'SMALL', label: 'Small Pets', icon: <Sparkles size={16} /> }
              ].map(item => {
                const isActive = petType === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setPetType(isActive ? null : item.id)}
                    className={`w-full flex items-center gap-3 rounded-2xl px-5 py-3.5 font-bold text-xs transition-all duration-300 border ${
                      isActive 
                        ? 'bg-[#a43e24] text-white border-[#a43e24] shadow-md shadow-[#a43e24]/10' 
                        : 'bg-[#faf9f6] border-[#e1e3df] text-[#8a7e75] hover:border-[#a43e24]/30'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Khoảng giá */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#303330]">Khoảng Giá (VND)</h3>
            <div className="space-y-2">
              <input
                type="range"
                min={200000}
                max={2000000}
                step={50000}
                value={priceRange}
                onChange={e => setPriceRange(Number(e.target.value))}
                className="w-full h-1 bg-[#e1e3df] rounded-lg appearance-none cursor-pointer accent-[#a43e24]"
              />
              <div className="flex justify-between text-[10px] font-bold text-[#8a7e75]">
                <span>200kđ</span>
                <span className="text-[#a43e24] font-black">{priceRange.toLocaleString('vi-VN')}đ</span>
                <span>2Mđ</span>
              </div>
            </div>
          </div>

          {/* Tiện nghi */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#303330]">Tiện Nghi</h3>
            <div className="space-y-3">
              {[
                { id: 'Private Garden', label: 'Sân vườn riêng' },
                { id: 'Điều hòa (AC)', label: 'Điều hòa nhiệt độ' },
                { id: 'Đệm ngủ cao cấp', label: 'Camera 24/7' }
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
                setPriceRange(1000000)
                setSelectedAmenities([])
              }}
              className="text-xs font-bold text-[#a43e24] hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        </aside>

        {/* CỘT PHẢI: CHI TIẾT DANH SÁCH KHÁCH SẠN */}
        <section className="flex-grow space-y-8">
          
          {/* Header & Tiêu đề kèm Thanh tìm kiếm */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#e1e3df] pb-6">
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#303330]">
                Tìm kiếm thiên đường nghỉ dưỡng
              </h1>
              <p className="text-[#8a7e75] text-xs sm:text-sm">
                Khám phá những không gian riêng tư, ấm cúng và đầy đủ tiện nghi dành riêng cho người bạn bốn chân.
              </p>
            </div>
            
            {/* Sorting & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Tìm kiếm phòng..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-[#faf9f6] border border-[#e1e3df] rounded-full pl-4 pr-10 py-2.5 text-xs outline-none focus:border-[#a43e24] transition-all"
                />
                <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              </div>
              <div className="flex items-center gap-3 bg-[#faf9f6] border border-[#e1e3df] p-2.5 rounded-full px-5 text-xs font-bold text-[#8a7e75]">
                <span>Sắp xếp:</span>
                <select className="bg-transparent border-none text-xs font-black text-[#303330] focus:ring-0 cursor-pointer p-0 outline-none">
                  <option>Gần nhất</option>
                  <option>Giá thấp đến cao</option>
                  <option>Đánh giá tốt nhất</option>
                </select>
                <ChevronDown size={12} className="text-stone-500" />
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
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-103"
                        src={hotel.image}
                        alt={hotel.name}
                      />
                      {/* Price Badge */}
                      <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full text-[#a43e24] font-black text-xs shadow-sm border border-[#e1e3df]">
                        {(hotel.price ?? 0).toLocaleString('vi-VN')}đ/đêm
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
                              <MapPin size={10} className="text-[#a43e24]" /> {hotel.address}
                            </p>
                          </div>
                          {hotel.isPopular && (
                            <span className="bg-[#d0fac0] text-[#2c4e24] text-[9px] font-black tracking-widest px-3 py-1 rounded-full shrink-0 uppercase">
                              Phổ biến
                            </span>
                          )}
                        </div>

                        {/* Rating row */}
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={12} fill="currentColor" />
                          <span className="text-xs font-black text-[#303330]">
                            {hotel.rating ? hotel.rating.toFixed(1) : '—'}
                          </span>
                          <span className="text-[10px] text-[#8a7e75] font-bold">
                            ({hotel.totalReviews || 0} đánh giá)
                          </span>
                        </div>

                        {/* Tags list */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {hotel.tags?.map((tag, idx) => (
                            <span key={idx} className="bg-[#feeadb]/60 text-[#a43e24] px-3 py-1 rounded-full text-[10px] font-bold">
                              {tag}
                            </span>
                          ))}
                        </div>
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
                          onClick={() => navigate(`/hotels/${hotel.id}`)}
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
                Đặc quyền Premium
              </span>
              <h2 className="text-3xl font-black text-[#2c4e24] leading-tight">
                Gói Chăm Sóc 'Luxury Paw'
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
