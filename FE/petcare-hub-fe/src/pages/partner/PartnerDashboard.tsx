import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  PawPrint,
  DollarSign,
  Calendar,
  Star,
  Users,
  Settings,
  PlusCircle,
  LogOut,
  MapPin,
  ListOrdered,
  ChevronRight,
  TrendingUp,
  Building,
  ShieldCheck,
  BarChart2,
  PieChart,
  ArrowUpRight
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
  const initialTab = searchParams.get('tab') === 'analytics' ? 'analytics' : 'hotels'
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [stats, setStats] = useState({
    todayBookings: 8,
    monthlyRevenue: 18500000,
    activeGuests: 14,
    rating: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'hotels' | 'analytics'>(initialTab)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load hotels
        const hotelRes = await axiosInstance.get('/api/hotels/my', {
          params: { page: 0, size: 20, sort: [] }
        })
        const hotelList = hotelRes.data.content || []
        setHotels(hotelList)

        // Tính rating trung bình
        if (hotelList.length > 0) {
          const avgRating = hotelList.reduce(
            (sum: number, h: any) => sum + (h.averageRating || 0), 0
          ) / hotelList.length

          setStats(prev => ({
            ...prev,
            rating: Math.round(avgRating * 10) / 10 || 5.0
          }))
        }

        // Load bookings của hotel đầu tiên để lấy stats
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
  const blueGradient = { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }
  const goldGradient = { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }

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
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                activeTab === 'analytics'
                  ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                  : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
              }`}
            >
              <span className="flex items-center gap-3">
                <BarChart2 size={18} /> Báo Cáo Thống Kê
              </span>
              <ChevronRight size={14} className={activeTab === 'analytics' ? 'opacity-100' : 'opacity-0'} />
            </button>

            <Link
              to="/partner/bookings"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330] transition-all"
            >
              <span className="flex items-center gap-3">
                <Calendar size={18} /> Duyệt Bookings
              </span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
            </Link>

            <Link
              to="/partner/hotels/new"
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330] transition-all"
            >
              <span className="flex items-center gap-3">
                <PlusCircle size={18} /> Đăng Ký Cơ Sở
              </span>
              <PlusCircle size={14} className="text-[#fa7150]" />
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
              Chào buổi sáng, {user?.fullName || 'Đối tác'}! 🐾
            </h1>
            <p className="text-[#8a7e75] text-sm max-w-xl">
              Hôm nay là một ngày tuyệt vời để quản lý các thiên đường nghỉ dưỡng thú cưng của bạn.
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

        {activeTab === 'hotels' ? (
          /* ── TAB 1: RESORT LIST SECTION ── */
          <section className="bg-white rounded-[32px] border border-[#e5d8d0] p-8 text-left shadow-[0_8px_30px_rgb(0,0,0,0.01)]" style={cardShadow}>
            <div className="flex items-center justify-between mb-8 border-b border-[#e5d8d0]/60 pb-6">
              <div>
                <h3 className="text-2xl font-black text-[#303330] flex items-center gap-2">
                  <Building size={24} className="text-[#fa7150]" /> Danh Sách Khách Sạn & Resort
                </h3>
                <p className="text-xs text-[#8a7e75] mt-1">Quản lý phòng nghỉ, menu dịch vụ và kiểm tra trạng thái phê duyệt cơ sở của bạn.</p>
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
        ) : (
          /* ── TAB 2: ANALYTICS & REPORTS (BÁO CÁO THỐNG KÊ) ── */
          <div className="space-y-8 animate-fadeIn">
            {/* ── STATS DASHBOARD GRID ── */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] transition-all hover:-translate-y-1 hover:shadow-md" style={cardShadow}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={orangeGradient}>
                    <Calendar size={22} />
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp size={10} /> +12%
                  </span>
                </div>
                <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Bookings Hôm Nay</span>
                <span className="text-3xl font-black text-[#303330]">{stats.todayBookings} đơn</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] transition-all hover:-translate-y-1 hover:shadow-md" style={cardShadow}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={greenGradient}>
                    <DollarSign size={22} />
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingUp size={10} /> +8.5%
                  </span>
                </div>
                <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Doanh Thu Tháng Này</span>
                <span className="text-3xl font-black text-[#303330]">{stats.monthlyRevenue.toLocaleString('vi-VN')}đ</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] transition-all hover:-translate-y-1 hover:shadow-md" style={cardShadow}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={blueGradient}>
                    <Users size={22} />
                  </div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded-full">
                    Ổn định
                  </span>
                </div>
                <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Thú Cưng Đang Gửi</span>
                <span className="text-3xl font-black text-[#303330]">{stats.activeGuests} bé</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] transition-all hover:-translate-y-1 hover:shadow-md" style={cardShadow}>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={goldGradient}>
                    <Star size={22} fill="currentColor" />
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> Uy tín
                  </span>
                </div>
                <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Đánh Giá Đối Tác</span>
                <span className="text-3xl font-black text-[#303330]">{stats.rating} / 5.0</span>
              </div>
            </section>

            {/* ── CHARTS SECTION ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Doanh thu theo tuần - Bar Chart */}
              <div className="bg-white p-8 rounded-[32px] border border-[#e5d8d0] text-left lg:col-span-2" style={cardShadow}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h4 className="text-lg font-black text-[#303330] flex items-center gap-2">
                      <TrendingUp size={20} className="text-[#fa7150]" /> Xu hướng doanh thu tuần qua
                    </h4>
                    <p className="text-xs text-[#8a7e75]">Doanh số tăng trưởng đều đặn qua các ngày</p>
                  </div>
                  <span className="text-xs font-black text-[#fa7150] bg-[#fa7150]/10 px-3.5 py-1.5 rounded-full flex items-center gap-1">
                    Tổng 7 ngày: 6.4M <ArrowUpRight size={14} />
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="relative h-64 w-full flex items-end justify-between pt-8 px-4 border-b border-[#e5d8d0]/60 pb-2">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-8">
                    <div className="border-t border-dashed border-[#e5d8d0]/40 w-full"></div>
                    <div className="border-t border-dashed border-[#e5d8d0]/40 w-full"></div>
                    <div className="border-t border-dashed border-[#e5d8d0]/40 w-full"></div>
                  </div>

                  {/* Bars */}
                  {[
                    { day: 'T2', val: 40, label: '800k' },
                    { day: 'T3', val: 55, label: '1.1M' },
                    { day: 'T4', val: 35, label: '700k' },
                    { day: 'T5', val: 70, label: '1.4M' },
                    { day: 'T6', val: 60, label: '1.2M' },
                    { day: 'T7', val: 95, label: '1.9M', active: true },
                    { day: 'CN', val: 85, label: '1.7M' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2.5 z-10 group cursor-pointer">
                      <div className="relative flex flex-col items-center">
                        {/* Tooltip */}
                        <span className="absolute -top-10 scale-0 group-hover:scale-100 bg-[#303330] text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-all duration-200 shadow-md">
                          {item.label}
                        </span>
                        {/* Bar */}
                        <div 
                          style={{ height: `${item.val * 1.6}px` }} 
                          className={`w-10 sm:w-12 rounded-t-xl transition-all duration-500 ease-out ${
                            item.active 
                              ? 'bg-gradient-to-t from-[#a43e24] to-[#fa7150] shadow-md shadow-[#fa7150]/20' 
                              : 'bg-gradient-to-t from-[#fa7150]/40 to-[#fa7150]/80 group-hover:from-[#fa7150]/60 group-hover:to-[#fa7150]'
                          }`}
                        />
                      </div>
                      <span className={`text-xs font-black ${item.active ? 'text-[#fa7150]' : 'text-[#8a7e75]'}`}>
                        {item.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tỷ lệ lấp đầy - Radial occupancy / Pie Chart */}
              <div className="bg-white p-8 rounded-[32px] border border-[#e5d8d0] text-left flex flex-col justify-between" style={cardShadow}>
                <div>
                  <h4 className="text-lg font-black text-[#303330] flex items-center gap-2">
                    <PieChart size={20} className="text-[#44683b]" /> Hiệu suất lấp đầy phòng
                  </h4>
                  <p className="text-xs text-[#8a7e75] mb-6">Tỷ lệ lấp đầy phòng trung bình tháng</p>
                </div>

                {/* Animated Circular Ring */}
                <div className="flex justify-center items-center my-4 relative">
                  <svg className="w-36 h-36 transform -rotate-90">
                    <circle 
                      cx="72" cy="72" r="60" 
                      stroke="#e5d8d0" strokeWidth="12" fill="transparent" 
                      className="opacity-40"
                    />
                    <circle 
                      cx="72" cy="72" r="60" 
                      stroke="#fa7150" strokeWidth="12" fill="transparent" 
                      strokeDasharray={376.8}
                      strokeDashoffset={376.8 * (1 - 0.78)}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-black text-[#303330]">78%</span>
                    <span className="text-[10px] font-bold text-[#8a7e75] uppercase tracking-wider">Đạt chỉ tiêu</span>
                  </div>
                </div>

                <div className="space-y-3 bg-[#faf9f6] p-4 rounded-2xl border border-[#e5d8d0]/60 mt-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8a7e75] font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#fa7150]" /> Đang hoạt động
                    </span>
                    <span className="font-bold text-[#303330]">32 phòng</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8a7e75] font-semibold flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e5d8d0]" /> Trống/Sẵn sàng
                    </span>
                    <span className="font-bold text-[#303330]">9 phòng</span>
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
