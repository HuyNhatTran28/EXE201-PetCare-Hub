import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  PawPrint, Calendar, Star,
  Settings, PlusCircle, LogOut, MapPin, ListOrdered,
  ChevronRight, TrendingUp, Building, BarChart2,
  Clock, Mail, MessageSquare, Save, Edit, Camera, Sparkles, QrCode, FileText, Download, Printer, ShieldAlert
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'

interface HotelType {
  id: string
  name: string
  address: string
  status: string
  averageRating: number
}

export const PartnerDashboard = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as any) || 'hotels'
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [stats, setStats] = useState({
    todayBookings: 8,
    monthlyRevenue: 18500000,
    activeGuests: 14,
    rating: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'hotels' | 'analytics' | 'bookings' | 'paperless' | 'settings'>(initialTab)

  // CRM state
  const [selectedPet, setSelectedPet] = useState<any>({
    name: 'Rocky',
    breed: 'Golden Retriever',
    age: '3 Tuổi',
    status: 'Đang lưu trú',
    behavior: 'Hay gặm nhẹ - Khi gặp người lạ hoặc lúc ăn. Cần tiếp cận chậm rãi.',
    diet: 'Hạt mềm - Không ăn được xương cứng, thích hạt trộn pate gà.',
    health: 'Sức khỏe - Dị ứng xà phòng mùi mạnh. Sử dụng loại thảo mộc.',
    img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=150'
  })

  // Paperless state
  const [checkInPetName, setCheckInPetName] = useState('Mochi - Golden Retriever')
  const [checkInHealth, setCheckInHealth] = useState('Khỏe mạnh, hơi nhát người lạ.')
  const [promoCode, setPromoCode] = useState('')
  const [usePoints, setUsePoints] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [showQrPay, setShowQrPay] = useState(false)

  // Settings State
  const [channels, setChannels] = useState({
    email: true,
    sms: true,
    zalo: false
  })
  const [generalSettings, setGeneralSettings] = useState({
    currency: 'VND',
    timezone: 'Bangkok',
    cooldown: 45
  })
  const [emailTemplate, setEmailTemplate] = useState('Chào {{owner_name}},\n\nChúng tôi rất háo hức được chào đón {{pet_name}} đến với PetCare Hub vào ngày {{check_in_date}}!')
  const [pointRule, setPointRule] = useState('10,000 VNĐ = 1 Điểm')
  const [settingsSubTab, setSettingsSubTab] = useState<'channels' | 'loyalty' | 'general'>('channels')

  // Interactive Booking State
  const [bookingFilter, setBookingFilter] = useState('ALL')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hotelRes = await axiosInstance.get('/api/hotels/my', {
          params: { page: 0, size: 20, sort: [] }
        })
        const hotelList = hotelRes.data.content || []
        setHotels(hotelList)

        if (hotelList.length > 0) {
          const avgRating = hotelList.reduce(
            (sum: number, h: any) => sum + (h.averageRating || 0), 0
          ) / hotelList.length

          setStats(prev => ({
            ...prev,
            rating: Math.round(avgRating * 10) / 10 || 5.0
          }))
        }

        if (hotelList.length > 0) {
          const bookingRes = await axiosInstance.get(
            `/api/bookings/hotel/${hotelList[0].id}`,
            { params: { page: 0, size: 100, sort: [] } }
          )
          const bookings = bookingRes.data.content || []
          const today = new Date().toISOString().split('T')[0]

          const todayBookings = bookings.filter((b: any) =>
            b.createdAt?.startsWith(today)
          ).length

          const activeGuests = bookings.filter((b: any) =>
            b.status === 'CHECKED_IN'
          ).length

          const monthlyRevenue = bookings
            .filter((b: any) => b.status === 'COMPLETED' || b.status === 'CHECKED_IN')
            .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)

          setStats(prev => ({
            ...prev,
            todayBookings,
            activeGuests,
            monthlyRevenue
          }))
        }
      } catch (error) {
        console.error('Failed to load dashboard data', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Premium design tokens
  const cardShadow = { boxShadow: '0 20px 40px rgba(164, 62, 36, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)' }
  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }
  const greenGradient = { background: 'linear-gradient(135deg, #44683b 0%, #2c4e24 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans flex flex-col md:flex-row">

      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-full md:w-80 bg-white border-r border-[#e5d8d0] flex flex-col justify-between p-6 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
        <div className="space-y-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={orangeGradient}>
              <PawPrint size={22} />
            </div>
            <div className="text-left">
              <span className="text-lg font-black tracking-tight block">PetCare Hub</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150]">RESORT CONSOLE</span>
            </div>
          </Link>

          {/* User Brief */}
          <div className="bg-[#faf9f6] p-4 rounded-2xl flex items-center gap-3 border border-[#e5d8d0]/60">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#e5d8d0] text-sm font-black text-[#fa7150]">
              {user?.fullName?.charAt(0) || 'P'}
            </div>
            <div className="text-left overflow-hidden">
              <span className="text-sm font-bold text-[#303330] block truncate">{user?.fullName || 'Đối tác'}</span>
              <span className="text-[10px] font-semibold text-[#8a7e75] block truncate">{user?.email || 'partner@gmail.com'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab('hotels')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'hotels'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Building size={18} /> Quản Lý Khách Sạn
              </span>
              <ChevronRight size={14} className={activeTab === 'hotels' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'bookings'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} /> Đặt Chỗ & Lịch Trình
              </span>
              <ChevronRight size={14} className={activeTab === 'bookings' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('paperless')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'paperless'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Sparkles size={18} /> Quy trình Không giấy tờ
              </span>
              <ChevronRight size={14} className={activeTab === 'paperless' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <BarChart2 size={18} /> Phân Tích & CRM
              </span>
              <ChevronRight size={14} className={activeTab === 'analytics' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <Settings size={18} /> Cài Đặt Hệ Thống
              </span>
              <ChevronRight size={14} className={activeTab === 'settings' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <div className="h-px bg-[#e5d8d0]/60 my-2" />

            <Link
              to="/partner/bookings"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330] transition-all"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} /> Danh sách Bookings
              </span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
            </Link>
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="pt-6 border-t border-[#e5d8d0]/60 mt-10 md:mt-0">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full py-3 px-4 rounded-2xl border border-red-100 text-red-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut size={16} /> Đăng xuất đối tác
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto max-w-7xl mx-auto w-full">

        {/* Greeting Banner */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12 text-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fa7150] animate-ping"></span>
              <span className="text-[#fa7150] text-xs font-black tracking-widest uppercase">PetCare Hub Partner Center</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-[#303330]">
              {activeTab === 'bookings' ? 'Lịch Đặt phòng Tương tác' :
               activeTab === 'paperless' ? 'Quy trình Không giấy tờ' :
               activeTab === 'analytics' ? 'Phân tích & CRM' :
               activeTab === 'settings' ? 'Cấu hình Hệ thống' :
               `Chào buổi sáng, ${user?.fullName || 'Đối tác'}! 🐾`}
            </h1>
            <p className="text-[#8a7e75] text-sm max-w-xl">
              {activeTab === 'bookings' ? 'Quản lý trạng thái phòng nghỉ và lịch trình đón thú cưng trong tuần này.' :
               activeTab === 'paperless' ? 'Quản lý tiếp nhận check-in và thanh toán bàn giao check-out thú cưng chuyên nghiệp.' :
               activeTab === 'analytics' ? 'Tổng quan hoạt động kinh doanh, doanh số và quản lý thông tin hồ sơ khách hàng.' :
               activeTab === 'settings' ? 'Cài đặt truyền thông, chương trình khách hàng thân thiết và quy tắc hệ thống.' :
               'Hôm nay là một ngày tuyệt vời để quản lý các thiên đường nghỉ dưỡng thú cưng của bạn.'}
            </p>
          </div>

          {/* Quick Registration Button */}
          <button
            onClick={() => navigate('/partner/hotels/new')}
            style={orangeGradient}
            className="px-6 py-3.5 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer w-fit self-start lg:self-center"
          >
            <PlusCircle size={16} /> Đăng ký thêm cơ sở mới
          </button>
        </header>

        {/* ── TAB 1: RESORT LIST SECTION ── */}
        {activeTab === 'hotels' && (
          <section className="bg-white rounded-[32px] border border-[#e5d8d0] p-8 text-left shadow-[0_8px_30px_rgb(0,0,0,0.01)]" style={cardShadow}>
            <div className="flex items-center justify-between mb-8 border-b border-[#e5d8d0]/60 pb-6">
              <div>
                <h3 className="text-2xl font-black text-[#303330] flex items-center gap-2">
                  <Building size={24} className="text-[#fa7150]" /> Danh Sách Khách Sạn & Resort
                </h3>
                <p className="text-xs text-[#8a7e75] mt-1">Quản lý phòng nghỉ, menu dịch vụ và kiểm tra trạng thái phê duyệt cơ sở của bạn.</p>
              </div>
            </div>

            {/* Dynamic Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Bookings Hôm nay</span>
                <span className="text-xl font-black text-[#303330]">{stats.todayBookings} đơn</span>
              </div>
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Doanh thu tháng này</span>
                <span className="text-xl font-black text-[#fa7150]">{stats.monthlyRevenue.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Khách đang lưu trú</span>
                <span className="text-xl font-black text-[#303330]">{stats.activeGuests} thú cưng</span>
              </div>
              <div className="bg-[#faf9f6]/80 border border-[#e5d8d0] p-5 rounded-2xl">
                <span className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1">Đánh giá trung bình</span>
                <span className="text-xl font-black text-[#44683b]">{stats.rating || 5.0} ★</span>
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center text-[#8a7e75] font-bold text-sm flex flex-col items-center gap-3">
                <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin"></span>
                Đang tải danh sách cơ sở...
              </div>
            ) : hotels.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-[#faf9f6]/40 p-8">
                <div className="w-16 h-16 rounded-full bg-[#fa7150]/10 flex items-center justify-center text-[#fa7150] mx-auto mb-4">
                  <Building size={28} />
                </div>
                <p className="text-[#8a7e75] font-bold text-sm mb-4">Bạn chưa đăng ký khách sạn nào hoặc đang chờ duyệt cơ sở.</p>
                <button
                  onClick={() => navigate('/partner/hotels/new')}
                  className="text-[#fa7150] font-black text-sm hover:underline cursor-pointer"
                >
                  Đăng ký cơ sở đầu tiên ngay →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {hotels.map((hotel) => {
                  const isActive = hotel.status === 'ACTIVE';
                  return (
                    <div 
                      key={hotel.id} 
                      className="bg-[#faf9f6]/40 border border-[#e5d8d0] rounded-3xl p-8 relative group overflow-hidden transition-all duration-300 hover:border-[#fa7150]/40 hover:bg-white hover:shadow-xl hover:shadow-[#fa7150]/2"
                    >
                      <div className="absolute top-0 right-0 w-36 h-36 bg-[#fa7150]/5 rounded-full -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      
                      <div className="flex justify-between items-start mb-6">
                        <div className="space-y-1.5 max-w-[70%]">
                          <h4 className="text-xl font-black text-[#303330] group-hover:text-[#fa7150] transition-colors">{hotel.name}</h4>
                          <p className="text-xs text-[#8a7e75] flex items-center gap-1.5 leading-relaxed">
                            <MapPin size={14} className="text-[#fa7150]" /> {hotel.address}
                          </p>
                        </div>
                        <span 
                          className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${
                            isActive 
                              ? 'bg-[#e3f4e1] text-[#2c4e24] border border-[#d0fac0]' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isActive ? 'ĐANG HOẠT ĐỘNG' : hotel.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 mt-4 mb-8 bg-white/70 backdrop-blur-sm p-4 rounded-2xl border border-[#e5d8d0]/60 w-fit">
                        <div className="flex items-center gap-1 text-[#f59e0b]">
                          <Star size={16} fill="currentColor" />
                          <span className="text-sm font-black text-[#303330]">{hotel.averageRating || 5.0}</span>
                        </div>
                        <div className="text-xs text-[#8a7e75]">
                          Bán kính: <span className="font-bold text-[#303330]">50km</span>
                        </div>
                      </div>

                      {/* Actions Grid */}
                      <div className="grid grid-cols-2 gap-4 border-t border-[#e5d8d0]/60 pt-6">
                        <Link 
                          to={`/partner/hotels/${hotel.id}/rooms`} 
                          className="bg-white border border-[#e5d8d0] py-3.5 rounded-2xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <Settings size={14} /> Cài đặt phòng
                        </Link>
                        <Link 
                          to={`/partner/hotels/${hotel.id}/services`} 
                          className="bg-white border border-[#e5d8d0] py-3.5 rounded-2xl text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] hover:shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <ListOrdered size={14} /> Danh mục dịch vụ
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── TAB 2: INTERACTIVE GRID CALENDAR (LỊCH ĐẶT PHÒNG TƯƠNG TÁC) ── */}
        {activeTab === 'bookings' && (
          <div className="space-y-6 text-left animate-fadeIn">
            {/* Filter Tabs & Quick Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 bg-[#f0ece9]/60 p-1 rounded-2xl">
                {['ALL', 'PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].map((stat) => (
                  <button
                    key={stat}
                    onClick={() => setBookingFilter(stat)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      bookingFilter === stat
                        ? 'bg-white text-[#303330] shadow-sm'
                        : 'text-[#8a7e75] hover:text-[#303330]'
                    }`}
                  >
                    {stat === 'ALL' ? 'Tất cả' :
                     stat === 'PENDING' ? 'Chờ xác nhận' :
                     stat === 'CONFIRMED' ? 'Đã xác nhận' :
                     stat === 'CHECKED_IN' ? 'Đang lưu trú' : 'Đã hoàn thành'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate('/partner/bookings')}
                style={orangeGradient}
                className="px-5 py-3 rounded-full text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
              >
                + Tạo đơn mới
              </button>
            </div>

            {/* Grid Table */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] overflow-hidden" style={cardShadow}>
              <div className="p-6 border-b border-[#e5d8d0]/60 flex justify-between items-center bg-[#faf9f6]/30">
                <span className="text-xs font-bold text-[#8a7e75]">Hôm nay: <strong className="text-[#303330]">24 Tháng 5</strong></span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#faf9f6]/80 text-[10px] font-black text-[#8a7e75] uppercase tracking-wider border-b border-[#e5d8d0]/80">
                      <th className="p-4 text-left pl-6 border-r border-[#e5d8d0]/50">Phòng / Ngày</th>
                      {['Thứ 2 (20)', 'Thứ 3 (21)', 'Thứ 4 (22)', 'Thứ 5 (23)', 'Thứ 6 (24)', 'Thứ 7 (25)', 'Chủ Nhật (26)'].map((d, i) => (
                        <th key={i} className={`p-4 text-center border-r border-[#e5d8d0]/50 ${i === 1 ? 'text-[#fa7150] font-black' : ''}`}>{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5d8d0]/60 text-xs">
                    {/* VIP 01 */}
                    <tr className="h-20">
                      <td className="p-4 pl-6 font-bold text-[#303330] border-r border-[#e5d8d0]/50 bg-[#faf9f6]/10">
                        <span className="block font-black">VIP01 - Cao cấp</span>
                        <span className="text-[10px] text-[#8a7e75]">Dành cho Mèo</span>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50"></td>
                      <td className="p-2 border-r border-[#e5d8d0]/50">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-2xl flex items-center gap-2">
                          <img src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=60" className="w-6 h-6 rounded-full object-cover" />
                          <div className="text-left leading-tight">
                            <span className="font-black block text-[10px]">Mimi (Chị Lan)</span>
                            <span className="text-[8px] text-emerald-600 font-bold">Đã thanh toán 100%</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50" colSpan={5}></td>
                    </tr>

                    {/* VIP 02 */}
                    <tr className="h-20">
                      <td className="p-4 pl-6 font-bold text-[#303330] border-r border-[#e5d8d0]/50 bg-[#faf9f6]/10">
                        <span className="block font-black">VIP02 - Đặc biệt</span>
                        <span className="text-[10px] text-[#8a7e75]">Dành cho Chó</span>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50" colSpan={2}></td>
                      <td className="p-2 border-r border-[#e5d8d0]/50">
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-2xl flex items-center gap-2">
                          <img src="https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=60" className="w-6 h-6 rounded-full object-cover" />
                          <div className="text-left leading-tight">
                            <span className="font-black block text-[10px]">LuLu (Anh Nam)</span>
                            <span className="text-[8px] text-amber-600 font-bold">Đặt cọc 50%</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50" colSpan={4}></td>
                    </tr>

                    {/* STD 01 */}
                    <tr className="h-20">
                      <td className="p-4 pl-6 font-bold text-[#303330] border-r border-[#e5d8d0]/50 bg-[#faf9f6]/10">
                        <span className="block font-black">STD01 - Tiện nghi</span>
                        <span className="text-[10px] text-[#8a7e75]">Phòng tiêu chuẩn</span>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50" colSpan={7}></td>
                    </tr>

                    {/* STD 02 */}
                    <tr className="h-20">
                      <td className="p-4 pl-6 font-bold text-[#303330] border-r border-[#e5d8d0]/50 bg-[#faf9f6]/10">
                        <span className="block font-black">STD02 - Tiện nghi</span>
                        <span className="text-[10px] text-[#8a7e75]">Phòng tiêu chuẩn</span>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50" colSpan={3}></td>
                      <td className="p-2 border-r border-[#e5d8d0]/50">
                        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-2xl flex items-center gap-2 animate-pulse">
                          <img src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=60" className="w-6 h-6 rounded-full object-cover" />
                          <div className="text-left leading-tight">
                            <span className="font-black block text-[10px]">Bông (Chị Thảo)</span>
                            <span className="text-[8px] text-rose-600 font-bold uppercase tracking-wider font-black">Sắp trả phòng</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-2 border-r border-[#e5d8d0]/50" colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-emerald-50 rounded-3xl border border-emerald-100 p-6 flex flex-col justify-between" style={cardShadow}>
                <div>
                  <span className="text-xs font-bold text-emerald-800 block mb-1">Công suất phòng</span>
                  <span className="text-3xl font-black text-emerald-950">84%</span>
                </div>
                <span className="text-[10px] font-black text-emerald-700 mt-4 flex items-center gap-1">
                  <TrendingUp size={12} /> +12% so với hôm qua
                </span>
              </div>

              <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 text-xs font-bold text-[#8a7e75]" style={cardShadow}>
                <span className="text-[10px] font-black uppercase text-[#303330] tracking-wider block mb-4">Chú thích màu sắc</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Đã thanh toán</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> Đã đặt cọc</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" /> Sắp trả phòng</div>
                  <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-300" /> Chờ thanh toán</div>
                </div>
              </div>

              <div className="bg-rose-50 rounded-3xl border border-rose-100 p-6 flex flex-col justify-between" style={cardShadow}>
                <div>
                  <span className="text-xs font-bold text-rose-800 block mb-1">Khách Walk-in chờ</span>
                  <span className="text-3xl font-black text-rose-950">03 bé</span>
                </div>
                <button
                  type="button"
                  className="mt-4 px-4 py-2.5 bg-[#a43e24] hover:bg-[#fa7150] text-white text-xs font-bold uppercase rounded-xl transition-colors cursor-pointer w-fit"
                >
                  Xử lý ngay
                </button>
              </div>
            </div>

            {/* Quick Actions Footer */}
            <div className="grid grid-cols-3 gap-6 pt-4">
              <div className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors" style={cardShadow}>
                <QrCode className="text-[#fa7150]" size={20} />
                <div className="text-left">
                  <span className="text-xs font-black text-[#303330] block">Check-in nhanh</span>
                  <span className="text-[10px] text-[#8a7e75] block mt-0.5">Quét mã QR hoặc nhập mã đơn</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors" style={cardShadow}>
                <Sparkles className="text-emerald-600" size={20} />
                <div className="text-left">
                  <span className="text-xs font-black text-[#303330] block">Yêu cầu dọn dẹp</span>
                  <span className="text-[10px] text-[#8a7e75] block mt-0.5">5 phòng đang chờ vệ sinh</span>
                </div>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[#e5d8d0] flex items-center gap-3 cursor-pointer hover:border-[#fa7150] transition-colors" style={cardShadow}>
                <FileText className="text-[#fa7150]" size={20} />
                <div className="text-left">
                  <span className="text-xs font-black text-[#303330] block">Xuất báo cáo ngày</span>
                  <span className="text-[10px] text-[#8a7e75] block mt-0.5">Tải về file Excel/PDF</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: PAPERLESS OPERATION (QUY TRÌNH KHÔNG GIẤY TỜ) ── */}
        {activeTab === 'paperless' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Column 1 & 2: Check-in / Check-out Workspace */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-8" style={cardShadow}>
              <div className="flex justify-between items-center border-b border-[#e5d8d0]/60 pb-4">
                <h3 className="text-2xl font-black text-[#303330]">Quy trình Không giấy tờ</h3>
                <button className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                  <Clock size={14} /> Lịch sử Giao dịch
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 1. Check-in Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#a43e24] text-white flex items-center justify-center font-black text-xs">1</span>
                    <h4 className="text-base font-black text-[#303330]">Thủ tục Check-in</h4>
                  </div>

                  {/* Photo Capture Area */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Ảnh khi đến</label>
                    <div className="h-44 bg-[#faf9f6] border border-[#e5d8d0] rounded-3xl flex flex-col items-center justify-center gap-2 text-[#8a7e75] cursor-pointer hover:border-[#fa7150] transition-colors">
                      <Camera size={26} />
                      <span className="text-[10px] font-bold">Chụp ảnh thú cưng hiện tại</span>
                    </div>
                  </div>

                  {/* Pet Name input */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Tên Thú cưng</label>
                    <input
                      type="text"
                      value={checkInPetName}
                      onChange={e => setCheckInPetName(e.target.value)}
                      className="w-full px-4 py-3 bg-[#f0ece9]/60 border-none rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Health status notes */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Tình trạng Sức khỏe</label>
                    <textarea
                      value={checkInHealth}
                      onChange={e => setCheckInHealth(e.target.value)}
                      rows={3}
                      placeholder="Ghi chú về thương tích, tâm trạng, thói quen ăn uống..."
                      className="w-full p-4 bg-[#f0ece9]/60 border-none rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>

                  {/* Signature pad representation */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-[#8a7e75] tracking-wider mb-2">Chữ ký Xác nhận (Chủ sở hữu)</label>
                    <div className="h-28 bg-[#faf9f6] border border-[#e5d8d0] rounded-3xl relative flex items-center justify-center">
                      {isSigned ? (
                        <span className="text-xs font-black font-mono text-[#44683b] uppercase tracking-widest border-2 border-[#44683b] px-3 py-1.5 rounded-xl rotate-[-6deg]">
                          ✓ ĐÃ KÝ XÁC NHẬN
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setIsSigned(true); }}
                          className="px-4 py-2 border border-dashed border-[#fa7150] rounded-xl text-[#fa7150] text-[10px] font-black uppercase cursor-pointer"
                        >
                          Ký xác nhận tại đây
                        </button>
                      )}
                      {isSigned && (
                        <button
                          type="button"
                          onClick={() => { setIsSigned(false); }}
                          className="absolute bottom-2 right-4 text-[9px] font-black text-[#a43e24] uppercase hover:underline cursor-pointer"
                        >
                          XÓA CHỮ KÝ
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={orangeGradient}
                    className="w-full py-4 text-white rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Gửi hóa đơn qua Zalo/SMS
                  </button>
                </div>

                {/* 2. Check-out Payment Section */}
                <div className="space-y-6 border-t md:border-t-0 md:border-l border-[#e5d8d0]/60 md:pl-8">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#44683b] text-white flex items-center justify-center font-black text-xs">2</span>
                    <h4 className="text-base font-black text-[#303330]">Thanh toán Check-out</h4>
                  </div>

                  {/* Line items details */}
                  <div className="space-y-3 bg-[#faf9f6] p-5 rounded-3xl border border-[#e5d8d0]/60">
                    <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                      <span>Phòng Deluxe (3 đêm)</span>
                      <span className="font-black text-[#303330]">1,050,000đ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                      <span>Tắm & Spa (Gói Cơ bản)</span>
                      <span className="font-black text-[#303330]">250,000đ</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-[#5a5550]">
                      <span>Thức ăn hạt cao cấp (x2)</span>
                      <span className="font-black text-[#303330]">120,000đ</span>
                    </div>
                    <div className="h-px bg-[#e5d8d0]/60 my-2" />
                    <div className="flex justify-between items-center text-sm font-bold text-[#303330]">
                      <span>Tạm tính</span>
                      <span className="text-[#a43e24] font-black text-base">1,420,000đ</span>
                    </div>
                  </div>

                  {/* Promo code */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã giảm giá..."
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-[#f0ece9]/60 border-none rounded-2xl text-xs font-bold outline-none"
                    />
                    <button className="px-4 py-2.5 bg-[#44683b] hover:bg-[#2c4e24] text-white rounded-2xl text-xs font-bold cursor-pointer">
                      Áp dụng
                    </button>
                  </div>

                  {/* Points Loyalty Toggle */}
                  <div className="flex justify-between items-center p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Sparkles size={14} /> Sử dụng 500 điểm thưởng
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={e => setUsePoints(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#44683b]" />
                    </label>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <span className="text-[10px] font-black text-[#8a7e75] uppercase block">TỔNG THANH TOÁN</span>
                      <span className="text-3xl font-black text-[#303330]">{usePoints ? '1,370,000đ' : '1,420,000đ'}</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowQrPay(!showQrPay)}
                        className="px-5 py-3.5 bg-[#303330] text-white font-black text-[10px] uppercase tracking-wider rounded-2xl flex items-center gap-2 hover:bg-black transition-colors cursor-pointer"
                      >
                        <QrCode size={16} /> Quét để thanh toán
                      </button>

                      {showQrPay && (
                        <div className="absolute right-0 bottom-16 bg-white border border-[#e5d8d0] p-4 rounded-3xl shadow-xl w-48 text-center animate-in fade-in zoom-in duration-200 z-10">
                          <span className="text-[9px] font-black uppercase text-[#8a7e75] block mb-2">Quét mã VietQR</span>
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=vietqr-payment-payload" className="w-32 h-32 mx-auto mb-2" />
                          <span className="text-[10px] font-black text-[#303330] block">{usePoints ? '1,370,000đ' : '1,420,000đ'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 3: E-Invoice Preview */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 flex flex-col justify-between" style={cardShadow}>
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-[#e5d8d0]/40 pb-4">
                  <h3 className="text-base font-black text-[#303330] flex items-center gap-2">
                    <FileText size={18} className="text-[#fa7150]" />
                    Hóa đơn điện tử #INV-9902
                  </h3>
                  <button className="text-[10px] font-black text-[#fa7150] hover:underline">Xem bản đầy đủ</button>
                </div>

                <div className="space-y-4 text-xs font-bold">
                  <div className="flex justify-between">
                    <span className="text-[#8a7e75] uppercase text-[10px]">Khách hàng</span>
                    <span className="text-[#303330]">NGUYỄN ANH THƯ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a7e75] uppercase text-[10px]">Thú cưng</span>
                    <span className="text-[#303330]">MOCHI (GOLDEN)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a7e75] uppercase text-[10px]">Thời gian</span>
                    <span className="text-[#303330]">12/10 - 15/10/2023</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#e5d8d0]/60 mt-6 flex gap-3">
                <button className="flex-1 py-3 bg-[#f0ece9] text-[#5a5550] rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#e5d8d0] transition-colors cursor-pointer">
                  <Download size={14} /> Tải xuống PDF
                </button>
                <button className="flex-1 py-3 bg-[#f0ece9] text-[#5a5550] rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#e5d8d0] transition-colors cursor-pointer">
                  <Printer size={14} /> In nhanh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: CRM ANALYTICS & PET PROFILES (PHÂN TÍCH & CRM) ── */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Left 2 Columns: Revenue Chart & Customer List */}
            <div className="lg:col-span-2 space-y-8">
              {/* Revenue chart & ratios stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 6 Months Revenue bar chart */}
                <div className="bg-white p-6 rounded-[2rem] border border-[#e5d8d0] md:col-span-2 flex flex-col justify-between" style={cardShadow}>
                  <div>
                    <h4 className="text-base font-black text-[#303330] mb-1">Biểu đồ Doanh thu</h4>
                    <p className="text-[10px] text-[#8a7e75] mb-4">Doanh thu Dự kiến vs Thực tế (6 tháng qua)</p>
                  </div>
                  <div className="h-44 flex items-end justify-between px-2 pt-6 border-b border-[#e5d8d0]/60 pb-2">
                    {[
                      { month: 'Th5', val: 30 },
                      { month: 'Th6', val: 45 },
                      { month: 'Th7', val: 75, active: true },
                      { month: 'Th8', val: 35 },
                      { month: 'Th9', val: 50 },
                      { month: 'Th10', val: 85, active: true }
                    ].map((m, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 group cursor-pointer">
                        <div 
                          style={{ height: `${m.val * 1.3}px` }}
                          className={`w-7 sm:w-9 rounded-t-lg transition-all duration-300 ${
                            m.active 
                              ? 'bg-[#a43e24] shadow-sm shadow-[#a43e24]/10' 
                              : 'bg-[#a43e24]/40 group-hover:bg-[#a43e24]/60'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-[#8a7e75]">{m.month}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right 1 Column Stats: Occupancy & Top Service */}
                <div className="space-y-6">
                  {/* Occupancy card */}
                  <div className="bg-[#e2f0d9] border border-[#c5e0b4] p-5 rounded-3xl text-left">
                    <span className="text-[10px] font-black text-[#385723] uppercase block mb-1">Tỷ lệ Lấp đầy</span>
                    <span className="text-3xl font-black text-[#385723] block">87.5%</span>
                    <span className="text-[9px] font-bold text-[#385723]/80 block mt-2">↑ +12% so với tháng trước</span>
                  </div>
                  {/* Top service card */}
                  <div className="bg-[#fa7150]/15 border border-[#fa7150]/20 p-5 rounded-3xl text-left">
                    <span className="text-[10px] font-black text-[#a43e24] uppercase block mb-1">Dịch vụ Hàng đầu</span>
                    <span className="text-2xl font-black text-[#a43e24] block leading-tight">Spa Trị liệu</span>
                    <span className="text-[9px] font-bold text-[#a43e24]/80 block mt-2">Chiếm 42% doanh thu phụ trợ</span>
                  </div>
                </div>
              </div>

              {/* Customers list */}
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6" style={cardShadow}>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-[#303330]">Danh sách Khách hàng</h3>
                  <button className="px-4 py-2 bg-[#a43e24] hover:bg-[#fa7150] text-white text-xs font-bold rounded-full cursor-pointer">
                    Thêm Khách hàng Mới
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { name: 'Nguyễn Minh Anh', pets: '2 Thú cưng (Mochi, Bơ)', amount: '12.500.000đ', rating: '4.9', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=60' },
                    { name: 'Trần Hoàng Long', pets: 'Đã nhận phòng (Rocky)', amount: '8.200.000đ', rating: '5.0', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=60' },
                    { name: 'Lê Tuyết Mai', pets: 'Lịch sử: 8 lần đặt', amount: '24.150.000đ', rating: '4.8', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=60' },
                  ].map((cust, idx) => (
                    <div key={idx} className="p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl flex items-center justify-between hover:border-[#fa7150]/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedPet({
                        name: 'Rocky',
                        breed: 'Golden Retriever',
                        age: '3 Tuổi',
                        status: 'Đang lưu trú',
                        behavior: 'Hay gặm nhẹ - Khi gặp người lạ hoặc lúc ăn. Cần tiếp cận chậm rãi.',
                        diet: 'Hạt mềm - Không ăn được xương cứng, thích hạt trộn pate gà.',
                        health: 'Sức khỏe - Dị ứng xà phòng mùi mạnh. Sử dụng loại thảo mộc.',
                        img: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=150'
                      })}
                    >
                      <div className="flex items-center gap-4">
                        <img src={cust.avatar} className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <div className="text-left leading-tight">
                          <span className="font-black text-sm text-[#303330] block">{cust.name}</span>
                          <span className="text-[10px] text-[#8a7e75] block mt-0.5">{cust.pets}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-[#303330] block">{cust.amount}</span>
                        <span className="text-[10px] text-[#f59e0b] font-black flex items-center justify-end gap-0.5 mt-0.5">
                          ★ {cust.rating}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column Profile Details */}
            {selectedPet && (
              <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6 flex flex-col justify-between" style={cardShadow}>
                <div className="space-y-6">
                  {/* Pet Photo */}
                  <div className="relative rounded-2xl overflow-hidden h-40">
                    <img src={selectedPet.img} alt={selectedPet.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 right-3 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase px-3 py-1 rounded-full">
                      {selectedPet.status}
                    </span>
                  </div>

                  {/* Title & Info */}
                  <div className="border-b border-[#e5d8d0]/40 pb-4">
                    <h3 className="text-2xl font-black text-[#303330]">{selectedPet.name}</h3>
                    <p className="text-xs text-[#8a7e75] mt-1 font-bold">{selectedPet.breed} • {selectedPet.age}</p>
                  </div>

                  {/* Special Care Rules */}
                  <div className="space-y-4 text-xs font-bold text-[#5a5550]">
                    <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-wider block">Ghi chú chăm sóc đặc biệt</span>
                    
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex gap-2 items-start">
                      <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-rose-800">Tính cách</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">{selectedPet.behavior}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl flex gap-2 items-start">
                      <PawPrint size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-emerald-800">Chế độ ăn</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">{selectedPet.diet}</p>
                      </div>
                    </div>

                    <div className="p-3 bg-[#faf9f6] border border-[#e5d8d0] text-[#303330] rounded-2xl flex gap-2 items-start">
                      <Settings size={16} className="shrink-0 mt-0.5 text-[#8a7e75]" />
                      <div>
                        <span className="font-black block uppercase text-[8px] text-[#8a7e75]">Sức khỏe</span>
                        <p className="text-[10px] leading-relaxed mt-0.5 font-bold">{selectedPet.health}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full py-3.5 bg-[#303330] hover:bg-black text-white text-xs font-black uppercase rounded-full tracking-wider mt-6 flex items-center justify-center gap-1.5 cursor-pointer">
                  <Edit size={14} /> Cập nhật Hồ sơ {selectedPet.name}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: SYSTEM SETTINGS (CÀI ĐẶT HỆ THỐNG) ── */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left animate-fadeIn">
            {/* Settings Control Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Tab menu subtabs */}
              <div className="flex gap-2 border-b border-[#e5d8d0]/60 pb-3">
                <button
                  onClick={() => setSettingsSubTab('channels')}
                  className={`pb-2 px-3 text-xs font-black relative ${
                    settingsSubTab === 'channels' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                  }`}
                >
                  Kênh Liên lạc
                </button>
                <button
                  onClick={() => setSettingsSubTab('loyalty')}
                  className={`pb-2 px-3 text-xs font-black relative ${
                    settingsSubTab === 'loyalty' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                  }`}
                >
                  Khách hàng Thân thiết
                </button>
                <button
                  onClick={() => setSettingsSubTab('general')}
                  className={`pb-2 px-3 text-xs font-black relative ${
                    settingsSubTab === 'general' ? 'text-[#fa7150] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150]' : 'text-[#8a7e75]'
                  }`}
                >
                  Thông số Chung
                </button>
              </div>

              {/* Channels list config */}
              {settingsSubTab === 'channels' && (
                <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-4" style={cardShadow}>
                  <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                    <Mail size={18} className="text-[#fa7150]" />
                    Các kênh đang hoạt động
                  </h3>
                  {[
                    { label: 'Thông báo Email', desc: 'Email giao dịch qua SendGrid', key: 'email' },
                    { label: 'Tin nhắn SMS (Twilio)', desc: 'Cảnh báo tức thì khi nhận thú cưng', key: 'sms' },
                    { label: 'Zalo OA (Official Account)', desc: 'Tích hợp khu vực cho Việt Nam', key: 'zalo' },
                  ].map((ch, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl">
                      <div>
                        <span className="text-sm font-black text-[#303330] block">{ch.label}</span>
                        <span className="text-[10px] text-[#8a7e75] block mt-0.5">{ch.desc}</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(channels as any)[ch.key]}
                          onChange={(e) => setChannels(prev => ({ ...prev, [ch.key]: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#fa7150]" />
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Loyalty Programs Settings (Image 5) */}
              {settingsSubTab === 'loyalty' && (
                <div className="space-y-6">
                  {/* Point rule settings */}
                  <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 flex justify-between items-center" style={cardShadow}>
                    <div className="text-left">
                      <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest block mb-1">CÔNG CỤ CỐT LÕI</span>
                      <h4 className="text-xl font-black text-[#303330]">Quy tắc Tích điểm</h4>
                    </div>
                    <div className="flex gap-2 items-center bg-[#faf9f6] p-3 rounded-2xl border border-[#e5d8d0]">
                      <input
                        type="text"
                        value={pointRule}
                        onChange={e => setPointRule(e.target.value)}
                        className="bg-transparent border-none outline-none font-bold text-xs font-mono text-[#a43e24] w-36 text-center"
                      />
                      <button className="p-1 text-[#fa7150] hover:text-[#a43e24]"><Edit size={14} /></button>
                    </div>
                  </div>

                  {/* Loyalty Tiers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
                    {[
                      { title: 'Bạc (Silver)', limit: '0 VNĐ', multiplier: '1.0x', perk1: 'Truy cập Phòng Tiêu chuẩn', perk2: 'Cập nhật Bản tin Ưu đãi', bg: 'bg-[#faf9f6]', text: 'text-[#303330]' },
                      { title: 'Vàng (Gold)', limit: '5,000,000 VNĐ', multiplier: '1.2x', perk1: 'Ưu tiên Đặt lịch nghỉ dưỡng', perk2: 'Tắm Spa Miễn phí (Hàng tháng)', perk3: 'Giảm 10% tại Cửa hàng', bg: 'bg-white border-2 border-[#fa7150]', text: 'text-[#fa7150]' },
                      { title: 'Bạch kim (Platinum)', limit: '20,000,000 VNĐ', multiplier: '1.5x', perk1: 'Hỗ trợ Quản gia Riêng biệt', perk2: 'Nâng cấp Phòng Deluxe Vô hạn', perk3: 'Tổ chức Sinh nhật cho bé', bg: 'bg-[#303330] text-white', text: 'text-[#fa7150]' }
                    ].map((tier, idx) => (
                      <div key={idx} className={`p-6 rounded-[2rem] border border-[#e5d8d0] flex flex-col justify-between h-80 ${tier.bg}`} style={cardShadow}>
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <span className="font-black text-sm block">{tier.title}</span>
                            <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150]">{tier.multiplier}</span>
                          </div>
                          <div className="text-[10px] font-bold text-[#8a7e75]">Chi tiêu từ {tier.limit}</div>
                          <ul className="space-y-2 text-[10px] font-bold list-disc pl-4 text-[#8a7e75]">
                            <li>{tier.perk1}</li>
                            <li>{tier.perk2}</li>
                            {tier.perk3 && <li>{tier.perk3}</li>}
                          </ul>
                        </div>
                        <button className="w-full py-2 bg-[#f0ece9]/60 text-[#303330] font-bold text-[10px] rounded-xl hover:bg-[#e5d8d0] transition-colors cursor-pointer mt-4">
                          Sửa Chi tiết
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Redemption Catalog Table */}
                  <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-6" style={cardShadow}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-base font-black text-[#303330]">Danh mục Đổi thưởng</h3>
                      <button style={greenGradient} className="px-3.5 py-1.5 text-white text-[10px] font-black uppercase rounded-full cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 transition-all">
                        Thêm Phần thưởng
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-[#faf9f6] border-b border-[#e5d8d0] text-[9px] font-black text-[#8a7e75] uppercase tracking-wider">
                            <th className="p-4 pl-6">Vật phẩm thưởng</th>
                            <th className="p-4">Danh mục</th>
                            <th className="p-4 text-center">Chi phí điểm</th>
                            <th className="p-4">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e5d8d0]/60 font-bold">
                          {[
                            { item: 'Một buổi Spa Miễn phí', cat: 'Làm đẹp', cost: '50 điểm', status: 'Đang hoạt động', color: 'text-emerald-700 bg-emerald-50' },
                            { item: 'Nâng cấp một Đêm lưu trú', cat: 'Lưu trú', cost: '120 điểm', status: 'Đang hoạt động', color: 'text-emerald-700 bg-emerald-50' },
                            { item: 'Bữa ăn Gourmet bổ sung', cat: 'Ăn uống', cost: '30 điểm', status: 'Bản nháp', color: 'text-[#8a7e75] bg-gray-100' },
                            { item: 'Đưa đón Sân bay Ưu tiên', cat: 'Vận chuyển', cost: '200 điểm', status: 'Đang hoạt động', color: 'text-emerald-700 bg-emerald-50' }
                          ].map((red, idx) => (
                            <tr key={idx} className="hover:bg-[#faf9f6]/30">
                              <td className="p-4 pl-6">{red.item}</td>
                              <td className="p-4 text-[#8a7e75]">{red.cat}</td>
                              <td className="p-4 text-center text-[#a43e24] font-black">{red.cost}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black ${red.color}`}>{red.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* General Settings parameters */}
              {settingsSubTab === 'general' && (
                <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 space-y-6" style={cardShadow}>
                  <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                    <Settings size={18} className="text-[#fa7150]" />
                    Thông số Chung
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Tiền tệ</span>
                      <select
                        value={generalSettings.currency}
                        onChange={e => setGeneralSettings(prev => ({ ...prev, currency: e.target.value }))}
                        className="px-4 py-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="VND">VND (đ) - Việt Nam Đồng</option>
                        <option value="USD">USD ($) - Đô la Mỹ</option>
                      </select>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Múi giờ</span>
                      <select
                        value={generalSettings.timezone}
                        onChange={e => setGeneralSettings(prev => ({ ...prev, timezone: e.target.value }))}
                        className="px-4 py-3 bg-[#faf9f6] border border-[#e5d8d0] rounded-2xl text-xs font-bold outline-none cursor-pointer"
                      >
                        <option value="Bangkok">(GMT+07:00) Bangkok, Hanoi</option>
                        <option value="Singapore">(GMT+08:00) Singapore, Kuala Lumpur</option>
                      </select>
                    </div>

                    <div className="col-span-2 pt-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[9px] font-black uppercase text-[#8a7e75] tracking-widest">Thời gian giãn cách đặt phòng (Phút)</span>
                        <span className="text-sm font-black text-[#fa7150]">{generalSettings.cooldown}m</span>
                      </div>
                      <input
                        type="range"
                        min="15"
                        max="120"
                        step="15"
                        value={generalSettings.cooldown}
                        onChange={e => setGeneralSettings(prev => ({ ...prev, cooldown: Number(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#fa7150]"
                      />
                      <span className="text-[9px] text-[#8a7e75] mt-1.5 block">Thời gian tối thiểu giữa các lần đặt phòng liên tiếp để làm vệ sinh.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notification Template editor */}
            <div className="bg-white rounded-[2rem] border border-[#e5d8d0] p-8 flex flex-col justify-between" style={cardShadow}>
              <div className="space-y-6">
                <h3 className="text-lg font-black text-[#303330] flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#fa7150]" />
                  Mẫu Thông báo
                </h3>
                
                {/* Pills */}
                <div className="flex gap-2 flex-wrap">
                  {['Xác nhận nhận phòng', 'Chúc mừng sinh nhật', 'Nhắc lịch tiêm chủng'].map((t, idx) => (
                    <span key={idx} className={`px-3 py-1.5 rounded-full text-[10px] font-bold cursor-pointer border ${idx === 0 ? 'bg-[#fa7150]/15 text-[#fa7150] border-[#fa7150]/30' : 'bg-[#faf9f6] text-[#8a7e75] border-[#e5d8d0]'}`}>
                      {t}
                    </span>
                  ))}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Tiêu đề Email</label>
                    <input
                      type="text"
                      value="Xác nhận dịch vụ tại PetCare Hub"
                      readOnly
                      className="w-full px-4 py-3 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#8a7e75] tracking-widest mb-1.5">Nội dung thông báo</label>
                    <textarea
                      value={emailTemplate}
                      onChange={e => setEmailTemplate(e.target.value)}
                      rows={5}
                      className="w-full p-4 bg-[#faf9f6] border border-[#e5d8d0]/60 rounded-2xl text-xs font-semibold outline-none focus:border-[#fa7150]"
                    />
                  </div>

                  {/* Template placeholder pills */}
                  <div className="flex gap-1.5 flex-wrap">
                    {['{{pet_name}}', '{{check_in_date}}', '{{room_type}}', '{{owner_name}}'].map((pill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg">{pill}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#e5d8d0]/60 mt-6 flex gap-3">
                <button
                  type="button"
                  style={orangeGradient}
                  className="flex-1 py-3 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md shadow-[#fa7150]/10 hover:opacity-95 cursor-pointer"
                >
                  <Save size={14} /> Lưu Mẫu
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  )
}
