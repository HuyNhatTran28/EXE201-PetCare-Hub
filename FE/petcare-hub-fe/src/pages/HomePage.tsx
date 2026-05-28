import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PawPrint,
  Calendar,
  MapPin,
  Search,
  Heart,
  Camera,
  Coffee,
  Compass,
  Scissors,
  Sparkles,
  ChevronRight,
  Star
} from 'lucide-react'

import { Header } from '@/components/Header'

export const HomePage = () => {
  const navigate = useNavigate()

  // State tìm kiếm booking
  const [petType, setPetType] = useState('CAT')
  const [checkIn, setCheckIn] = useState('2024-10-24')
  const [checkOut, setCheckOut] = useState('2024-10-30')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Chuyển sang danh sách khách sạn kèm query params
    navigate(`/hotels?type=${petType}&checkIn=${checkIn}&checkOut=${checkOut}&q=${searchQuery}`)
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#fa7150] selection:text-white" style={{ backgroundColor: '#fcf8f5' }}>
      
      {/* ── 1. HEADER (NAVBAR) ─────────────────────────────────── */}
      <Header />

      {/* ── 2. HERO SECTION ───────────────────────────────────── */}
      <section className="relative px-6 py-12 lg:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-7 flex flex-col justify-center z-10">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 text-[#a43e24]" style={{ backgroundColor: '#fdf0ec' }}>
              <Sparkles size={12} /> Khách sạn & Spa thú cưng cao cấp
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#303330] leading-[1.1] mb-6">
              Nơi mỗi <span className="text-[#fa7150]">bạn nhỏ</span><br />
              tìm thấy bình yên.
            </h1>
            <p className="text-base sm:text-lg text-[#5a5550] leading-relaxed max-w-xl mb-10">
              Không gian nghỉ dưỡng được thiết kế riêng cho sự thoải mái, an toàn và niềm vui của thú cưng. Vì chúng cũng xứng đáng có một kỳ nghỉ tuyệt vời.
            </p>

            {/* Quick Search Widget */}
            <form onSubmit={handleSearch} className="bg-white p-4 rounded-3xl shadow-xl shadow-[#a43e24]/5 border border-[#f0e4de] flex flex-col md:flex-row gap-3 max-w-3xl">
              
              {/* Pet Type Select */}
              <div className="flex-1 min-w-[120px] flex items-center gap-3 px-3 py-2 border-r border-[#fa7150]/10 last:border-0">
                <PawPrint size={18} className="text-[#fa7150] flex-shrink-0" />
                <div className="flex-grow text-left">
                  <label className="block text-[10px] font-bold text-[#8a807a] uppercase tracking-wider mb-0.5">Chọn Thú Cưng</label>
                  <select 
                    value={petType} 
                    onChange={(e) => setPetType(e.target.value)}
                    className="w-full text-sm font-bold text-[#303330] outline-none bg-transparent cursor-pointer"
                  >
                    <option value="CAT">Mèo</option>
                    <option value="DOG_SMALL">Chó nhỏ (&lt;10kg)</option>
                    <option value="DOG_LARGE">Chó lớn (&gt;10kg)</option>
                  </select>
                </div>
              </div>

              {/* Check In Date */}
              <div className="flex-1 min-w-[140px] flex items-center gap-3 px-3 py-2 border-r border-[#fa7150]/10 last:border-0">
                <Calendar size={18} className="text-[#fa7150] flex-shrink-0" />
                <div className="flex-grow text-left">
                  <label className="block text-[10px] font-bold text-[#8a807a] uppercase tracking-wider mb-0.5">Ngày Nhận</label>
                  <input 
                    type="date" 
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full text-sm font-bold text-[#303330] outline-none bg-transparent cursor-pointer" 
                  />
                </div>
              </div>

              {/* Check Out Date */}
              <div className="flex-1 min-w-[140px] flex items-center gap-3 px-3 py-2 border-r border-[#fa7150]/10 last:border-0">
                <Calendar size={18} className="text-[#fa7150] flex-shrink-0" />
                <div className="flex-grow text-left">
                  <label className="block text-[10px] font-bold text-[#8a807a] uppercase tracking-wider mb-0.5">Ngày Trả</label>
                  <input 
                    type="date" 
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full text-sm font-bold text-[#303330] outline-none bg-transparent cursor-pointer" 
                  />
                </div>
              </div>

              {/* Search String */}
              <div className="flex-[1.5] min-w-[200px] flex items-center gap-3 px-3 py-2">
                <MapPin size={18} className="text-[#fa7150] flex-shrink-0" />
                <div className="flex-grow text-left">
                  <label className="block text-[10px] font-bold text-[#8a807a] uppercase tracking-wider mb-0.5">Địa Điểm</label>
                  <input 
                    type="text" 
                    placeholder="Tìm khách sạn gần bạn..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm font-bold text-[#303330] outline-none placeholder-[#a59a94]"
                  />
                </div>
              </div>

              {/* Search Button */}
              <button 
                type="submit" 
                className="bg-[#fa7150] text-white p-3.5 rounded-2xl flex items-center justify-center hover:bg-[#fa7150]/90 hover:scale-[1.03] active:scale-95 transition-all shadow-md shadow-[#fa7150]/20 cursor-pointer"
              >
                <Search size={20} />
              </button>

            </form>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5 relative flex justify-center items-center z-10">
            <div className="relative w-full max-w-md aspect-square rounded-[2.5rem] overflow-hidden border-[8px] border-white shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800" 
                alt="Chú chó hạnh phúc nghỉ dưỡng"
                className="w-full h-full object-cover rounded-[2rem]"
              />
              {/* Overlapping tiny card */}
              <div className="absolute bottom-6 left-6 right-6 bg-[#fa7150]/90 backdrop-blur-sm p-4 rounded-2xl flex items-center justify-between text-white shadow-lg">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-100">Ưu đãi mùa hè</p>
                  <p className="text-sm font-black">Giảm ngay 20% các dịch vụ Spa</p>
                </div>
                <Link to="/hotels" className="p-2 bg-white text-[#fa7150] rounded-full hover:scale-105 transition-transform">
                  <ChevronRight size={18} />
                </Link>
              </div>
            </div>
            {/* Blob decorations */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[#fa7150]/5 rounded-full blur-3xl pointer-events-none -z-10" />
          </div>

        </div>
      </section>

      {/* ── 3. CORE FEATURES SECTION ──────────────────────────── */}
      <section className="px-6 py-16 bg-white border-y border-[#f0e4de]">
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#303330] mb-4">
              Mọi thứ vì hạnh phúc của thú cưng
            </h2>
            <p className="text-sm sm:text-base text-[#5a5550]">
              Chúng tôi không chỉ cung cấp dịch vụ lưu trú mà còn mang tới một môi trường ngôi nhà thứ hai, tràn ngập tình yêu và sự chăm sóc chuyên nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Card 1: Chuyên gia tận tâm */}
            <div className="lg:col-span-4 bg-[#fbf7f4] p-8 rounded-3xl border border-[#f0e4de] flex flex-col justify-between hover:shadow-xl hover:shadow-[#fa7150]/5 transition-all group">
              <div className="mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-[#f0e4de] text-[#fa7150] mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <Heart size={22} fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold text-[#303330] mb-3">Chuyên gia tận tâm</h3>
                <p className="text-sm text-[#5a5550] leading-relaxed">
                  Đội ngũ bảo mẫu chuyên nghiệp hành vi và bác sĩ thú y trực 24/7, đảm bảo an toàn tuyệt đối cho bé yêu của bạn.
                </p>
              </div>
              <div className="rounded-2xl overflow-hidden h-40 w-full mt-4">
                <img 
                  src="https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&q=80&w=400" 
                  alt="Chăm sóc thú cưng" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Card 2: Camera trực tiếp */}
            <div className="lg:col-span-4 bg-[#fbf7f4] p-8 rounded-3xl border border-[#f0e4de] flex flex-col justify-between hover:shadow-xl hover:shadow-[#fa7150]/5 transition-all group">
              <div className="mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-[#f0e4de] text-[#fa7150] mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <Camera size={22} />
                </div>
                <h3 className="text-xl font-bold text-[#303330] mb-3">Camera trực tuyến</h3>
                <p className="text-sm text-[#5a5550] leading-relaxed">
                  Theo dõi bé cưng mọi lúc mọi nơi nhờ hệ thống camera HD chất lượng cao được lắp đặt tại mỗi phòng.
                </p>
              </div>
              <div className="mt-auto">
                <Link to="/my-bookings" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#fa7150] hover:text-[#fa7150]/80 group/btn">
                  Xem chi tiết <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Card 3: Bữa ăn hảo hạng */}
            <div className="lg:col-span-4 bg-[#fbf7f4] p-8 rounded-3xl border border-[#f0e4de] flex flex-col justify-between hover:shadow-xl hover:shadow-[#fa7150]/5 transition-all group">
              <div className="mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-[#f0e4de] text-[#fa7150] mb-6 shadow-sm group-hover:scale-110 transition-transform">
                  <Coffee size={22} />
                </div>
                <h3 className="text-xl font-bold text-[#303330] mb-3">Bữa ăn hảo hạng</h3>
                <p className="text-sm text-[#5a5550] leading-relaxed">
                  Chế độ dinh dưỡng khoa học với nguyên liệu tươi ngon chọn lọc chuẩn bị hằng ngày bởi các đầu bếp thú cưng.
                </p>
              </div>
              <div className="mt-auto h-2 bg-[#f0e4de] rounded-full overflow-hidden">
                <div className="h-full bg-[#fa7150] rounded-full w-4/5" />
              </div>
            </div>

            {/* Highlight Card 4: Khu vui chơi rộng lớn */}
            <div className="lg:col-span-12 text-white p-8 sm:p-12 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-8 hover:shadow-2xl transition-shadow relative overflow-hidden" style={{ backgroundColor: '#1e392a' }}>
              <div className="relative z-10 max-w-xl">
                <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs font-bold tracking-wider mb-4 text-[#fa7150]">KHÔNG GIAN MỞ</span>
                <h3 className="text-2xl sm:text-3xl font-extrabold mb-4">Khu vui chơi rộng lớn</h3>
                <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6">
                  Hơn 500m2 không gian ngoài trời ngập tràn cây xanh và trò chơi vận động chuyên biệt, giúp các bé thỏa sức chạy nhảy và giải tỏa năng lượng.
                </p>
                <Link to="/hotels" className="inline-flex items-center gap-2 bg-[#fa7150] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#fa7150]/90 transition-colors shadow-lg shadow-[#fa7150]/15">
                  Khám phá khuôn viên <Compass size={16} />
                </Link>
              </div>
              
              <div className="w-full md:w-80 aspect-video md:aspect-square rounded-2xl overflow-hidden relative z-10 flex-shrink-0">
                <img 
                  src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=400" 
                  alt="Chó chạy nhảy ngoài sân"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Decor Leaf */}
              <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ backgroundColor: '#fa7150' }} />
            </div>

          </div>

        </div>
      </section>

      {/* ── 4. ROOM CATEGORIES SECTION ────────────────────────── */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-[#303330] mb-3">
                Các hạng phòng cao cấp
              </h2>
              <p className="text-sm text-[#5a5550]">
                Không gian được thiết kế rộng rãi, tiện nghi, đáp ứng mọi nhu cầu của các boss cưng.
              </p>
            </div>
            <Link to="/hotels" className="text-sm font-bold text-[#a43e24] hover:underline inline-flex items-center gap-1 mt-4 sm:mt-0">
              Xem tất cả các phòng <ChevronRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Room 1 */}
            <div className="bg-white rounded-3xl overflow-hidden border border-[#f0e4de] hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1513360309081-36f5e878fc9e?auto=format&fit=crop&q=80&w=400" 
                  alt="Hạng phòng Garden Deluxe" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-[#a43e24]">
                  150.000đ/đêm
                </span>
              </div>
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-[#fa7150] uppercase tracking-wider mb-1">Dành cho mèo</p>
                  <h3 className="text-lg font-bold text-[#303330] mb-2 group-hover:text-[#fa7150] transition-colors">Hạng phòng Garden Deluxe</h3>
                  <p className="text-xs text-[#5a5550] leading-relaxed mb-4">Lối đi riêng ra sân vườn thoáng đãng tràn ngập ánh nắng tự nhiên.</p>
                </div>
                <Link to="/hotels" className="w-10 h-10 bg-[#fbf7f4] text-[#fa7150] border border-[#f0e4de] rounded-full flex items-center justify-center ml-auto hover:bg-[#fa7150] hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Room 2 */}
            <div className="bg-white rounded-3xl overflow-hidden border border-[#f0e4de] hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1541599540903-216a46ca1ad0?auto=format&fit=crop&q=80&w=400" 
                  alt="Phòng Zenith Loft" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-[#a43e24]">
                  350.000đ/đêm
                </span>
              </div>
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-[#fa7150] uppercase tracking-wider mb-1">Dành cho mèo & chó nhỏ</p>
                  <h3 className="text-lg font-bold text-[#303330] mb-2 group-hover:text-[#fa7150] transition-colors">Phòng Zenith Loft</h3>
                  <p className="text-xs text-[#5a5550] leading-relaxed mb-4">Thỏa sức leo trèo với cấu trúc nhiều tầng và võng nằm êm ái ngắm trời.</p>
                </div>
                <Link to="/hotels" className="w-10 h-10 bg-[#fbf7f4] text-[#fa7150] border border-[#f0e4de] rounded-full flex items-center justify-center ml-auto hover:bg-[#fa7150] hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

            {/* Room 3 */}
            <div className="bg-white rounded-3xl overflow-hidden border border-[#f0e4de] hover:shadow-2xl hover:scale-[1.01] transition-all group flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&q=80&w=400" 
                  alt="Dinh thự Presidential" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <span className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs font-black text-[#a43e24]">
                  2.000.000đ/đêm
                </span>
              </div>
              <div className="p-6 flex-grow flex flex-col justify-between">
                <div>
                  <p className="text-xs font-bold text-[#fa7150] uppercase tracking-wider mb-1">Dành cho mọi boss</p>
                  <h3 className="text-lg font-bold text-[#303330] mb-2 group-hover:text-[#fa7150] transition-colors">Dinh thự Presidential</h3>
                  <p className="text-xs text-[#5a5550] leading-relaxed mb-4">Quản gia riêng chăm sóc 24/7, camera streaming riêng và bồn tắm sục.</p>
                </div>
                <Link to="/hotels" className="w-10 h-10 bg-[#fbf7f4] text-[#fa7150] border border-[#f0e4de] rounded-full flex items-center justify-center ml-auto hover:bg-[#fa7150] hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── 5. OTHER SERVICES SECTION ─────────────────────────── */}
      <section className="px-6 py-16 bg-[#fbf7f4] border-y border-[#f0e4de]">
        <div className="max-w-7xl mx-auto">
          
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-extrabold text-[#303330] mb-4">
              Không chỉ là nơi lưu trú
            </h2>
            <p className="text-sm text-[#5a5550]">
              Chúng tôi cung cấp các gói chăm sóc trọn vẹn sức khỏe thể chất và tinh thần cho cưng yêu.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service 1 */}
            <div className="bg-white p-8 rounded-3xl border border-[#f0e4de] hover:shadow-xl transition-all text-center flex flex-col items-center justify-between">
              <div className="w-12 h-12 bg-[#fff0e6] rounded-2xl flex items-center justify-center text-[#fa7150] mb-6">
                <Scissors size={22} />
              </div>
              <h3 className="text-lg font-bold text-[#303330] mb-3">Grooming Chuyên Nghiệp</h3>
              <p className="text-xs text-[#5a5550] leading-relaxed mb-6 max-w-xs">
                Tẩy tế bào chết, tắm sạch, sấy mát và tạo kiểu lông thời thượng theo chuẩn giống loài bởi các thợ tay nghề cao.
              </p>
              <Link to="/hotels" className="text-xs font-bold text-[#fa7150] hover:underline">
                Đặt lịch ngay →
              </Link>
            </div>

            {/* Service 2 */}
            <div className="bg-white p-8 rounded-3xl border border-[#f0e4de] hover:shadow-xl transition-all text-center flex flex-col items-center justify-between">
              <div className="w-12 h-12 bg-[#fff0e6] rounded-2xl flex items-center justify-center text-[#fa7150] mb-6">
                <Sparkles size={22} />
              </div>
              <h3 className="text-lg font-bold text-[#303330] mb-3">Spa Thư Giãn</h3>
              <p className="text-xs text-[#5a5550] leading-relaxed mb-6 max-w-xs">
                Liệu pháp tắm thủy liệu, xông tinh dầu hoa cúc hữu cơ và massage giảm nhức các cơ khớp dành cho mọi lứa tuổi.
              </p>
              <Link to="/hotels" className="text-xs font-bold text-[#fa7150] hover:underline">
                Đặt lịch ngay →
              </Link>
            </div>

            {/* Service 3 */}
            <div className="bg-white p-8 rounded-3xl border border-[#f0e4de] hover:shadow-xl transition-all text-center flex flex-col items-center justify-between">
              <div className="w-12 h-12 bg-[#fff0e6] rounded-2xl flex items-center justify-center text-[#fa7150] mb-6">
                <Heart size={22} />
              </div>
              <h3 className="text-lg font-bold text-[#303330] mb-3">Hoạt Động Mỗi Ngày</h3>
              <p className="text-xs text-[#5a5550] leading-relaxed mb-6 max-w-xs">
                Các bài tập huấn luyện cơ bản, ném đĩa đuổi bóng và tương tác bạn bè nhằm tăng cường cơ xương khớp dẻo dai.
              </p>
              <Link to="/hotels" className="text-xs font-bold text-[#fa7150] hover:underline">
                Đặt lịch ngay →
              </Link>
            </div>

          </div>

        </div>
      </section>

      {/* ── 6. PET DIARY / TESTIMONIALS ───────────────────────── */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Dog Left Photo Card */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div className="relative w-full max-w-sm aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&q=80&w=600" 
                alt="Chú chó dễ thương"
                className="w-full h-full object-cover"
              />
              
              {/* Overlapping Badge */}
              <div className="absolute -bottom-4 -right-4 bg-[#fa7150] text-white p-6 rounded-3xl shadow-xl flex flex-col items-center justify-center border-4 border-white">
                <span className="text-3xl font-black leading-none">4.9/5</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-100 mt-1">Hài Lòng</span>
              </div>
            </div>
          </div>

          {/* Testimonial Right Info */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <span className="text-xs font-bold text-[#fa7150] uppercase tracking-widest mb-4">Nhật ký thú cưng</span>
            
            {/* Stars */}
            <div className="flex gap-1 mb-6 text-yellow-400">
              <Star size={18} fill="currentColor" />
              <Star size={18} fill="currentColor" />
              <Star size={18} fill="currentColor" />
              <Star size={18} fill="currentColor" />
              <Star size={18} fill="currentColor" />
            </div>

            <blockquote className="text-xl sm:text-2xl font-bold text-[#303330] leading-relaxed italic mb-8">
              "Cooper đã có một khoảng thời gian tuyệt vời! Tôi rất thích việc nhận được các cập nhật nhật ký hoạt động cùng hình ảnh sắc nét hàng ngày, giúp tôi vô cùng an tâm đi công tác xa."
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-cover bg-center border border-[#f0e4de]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150')` }} />
              <div>
                <p className="text-sm font-bold text-[#303330]">Hồng Nhung</p>
                <p className="text-xs text-[#8a807a]">Mẹ của bé Cooper (Golden Retriever)</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── 7. FOOTER ─────────────────────────────────────────── */}
      <footer className="bg-[#1e392a] text-[#cce2d5] px-6 py-16 mt-auto border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          
          <div className="md:col-span-4 text-left">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <PawPrint size={28} className="text-[#fa7150]" />
              <span className="text-xl font-bold tracking-tight text-white">
                PetCare Hub
              </span>
            </Link>
            <p className="text-xs text-gray-400 leading-relaxed mb-6 max-w-sm">
              Nâng niu và mang lại trải nghiệm nghỉ dưỡng hoàn hảo nhất cho cưng yêu của bạn. Tiện nghi hàng đầu Việt Nam.
            </p>
            <div className="flex gap-4">
              <span className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center cursor-pointer">🐾</span>
              <span className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center cursor-pointer">📸</span>
              <span className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 hover:text-white transition-all flex items-center justify-center cursor-pointer">💌</span>
            </div>
          </div>

          <div className="md:col-span-2 text-left">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-6">Liên Kết Nhanh</h4>
            <ul className="space-y-4 text-xs">
              <li><Link to="/hotels" className="hover:text-white transition-colors">Về chúng tôi</Link></li>
              <li><Link to="/hotels" className="hover:text-white transition-colors">Tiện ích</Link></li>
              <li><Link to="/my-bookings" className="hover:text-white transition-colors">Câu hỏi thường gặp</Link></li>
              <li><Link to="/profile" className="hover:text-white transition-colors">Biểu phí dịch vụ</Link></li>
            </ul>
          </div>

          <div className="md:col-span-2 text-left">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-6">Dịch Vụ Của Chúng Tôi</h4>
            <ul className="space-y-4 text-xs">
              <li><Link to="/hotels" className="hover:text-white transition-colors">Khách sạn thú cưng</Link></li>
              <li><Link to="/hotels" className="hover:text-white transition-colors">Grooming & tắm</Link></li>
              <li><Link to="/my-bookings" className="hover:text-white transition-colors">Nhật ký chăm ngày</Link></li>
              <li><Link to="/hotels" className="hover:text-white transition-colors">Spa & trị liệu</Link></li>
            </ul>
          </div>

          <div className="md:col-span-4 text-left">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-6">Đăng Ký Nhận Tin</h4>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Đăng ký để nhận các ưu đãi và mẹo chăm sóc thú cưng mới nhất.
            </p>
            <form className="flex gap-2">
              <input 
                type="email" 
                placeholder="Địa chỉ Email" 
                className="bg-white/5 border border-white/10 text-white placeholder-gray-500 text-xs px-4 py-3 rounded-xl outline-none focus:border-[#fa7150] transition-colors w-full"
              />
              <button type="submit" className="bg-[#fa7150] text-white px-4 py-3 rounded-xl text-xs font-bold hover:bg-[#fa7150]/90 transition-colors cursor-pointer">
                Đăng ký
              </button>
            </form>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-white/5 mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© 2024 PetCare Hub. Bảo lưu mọi quyền.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white">Chính sách bảo mật</a>
            <a href="#" className="hover:text-white">Cookies</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
