import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PawPrint,
  DollarSign,
  Calendar,
  Star,
  Users,
  Settings,
  PlusCircle,
  Activity,
  LogOut,
  MapPin,
  ListOrdered
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
  const [hotels, setHotels] = useState<HotelType[]>([])
  const [stats] = useState({
    todayBookings: 8,
    monthlyRevenue: 15600000,
    activeGuests: 12,
    rating: 4.9
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPartnerHotels = async () => {
      try {
        const response = await axiosInstance.get('/api/hotels/my')
        setHotels(response.data)
      } catch (error) {
        console.error('Failed to load partner hotels', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPartnerHotels()
  }, [])

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-[#e5d8d0] px-6 py-4 flex items-center justify-between h-20">
        <Link to="/" className="flex items-center gap-2">
          <PawPrint size={28} className="text-[#fa7150]" />
          <span className="text-xl font-bold tracking-tight">PetCare Hub <span className="text-xs bg-[#fa7150]/10 text-[#fa7150] px-2 py-0.5 rounded-full font-black ml-1">PARTNER</span></span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/partner/bookings" className="text-sm font-semibold text-[#5a5550] hover:text-[#fa7150] transition-colors">Duyệt Booking</Link>
          <span className="text-xs text-[#8a7e75] font-bold">Xin chào, {user?.fullName || 'Đối tác'}</span>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-sm font-semibold text-red-500 flex items-center gap-1.5 hover:text-red-600 transition-colors">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        
        {/* Banner tiêu đề */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 text-left">
          <div className="space-y-2">
            <span className="text-[#fa7150] text-xs font-black tracking-wider uppercase">Bảng điều khiển khách sạn</span>
            <h1 className="text-4xl font-black tracking-tight text-[#303330]">
              Quản Trị Đối Tác
            </h1>
            <p className="text-[#5a5550] text-sm max-w-xl">
              Giám sát tình hình kinh doanh, quản lý phòng nghỉ, danh mục dịch vụ và tiếp đón các bé cưng.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 text-left">
          <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#fff0e6] flex items-center justify-center text-[#fa7150] mb-4">
              <Calendar size={22} />
            </div>
            <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Booking Hôm Nay</span>
            <span className="text-3xl font-black text-[#303330]">{stats.todayBookings} đơn</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#e3f4e1] flex items-center justify-center text-[#44683b] mb-4">
              <DollarSign size={22} />
            </div>
            <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Doanh Thu Tháng Này</span>
            <span className="text-3xl font-black text-[#303330]">{stats.monthlyRevenue.toLocaleString('vi-VN')} đ</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#e3e8f4] flex items-center justify-center text-blue-600 mb-4">
              <Users size={22} />
            </div>
            <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Thú Cưng Lưu Trú</span>
            <span className="text-3xl font-black text-[#303330]">{stats.activeGuests} bé</span>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-[#fdf5e6] flex items-center justify-center text-[#fa7150] mb-4">
              <Star size={22} fill="currentColor" />
            </div>
            <span className="text-xs font-bold text-[#8a7e75] uppercase block mb-1">Đánh Giá Trung Bình</span>
            <span className="text-3xl font-black text-[#303330]">{stats.rating} / 5.0</span>
          </div>
        </div>

        {/* Hotels Managed Section */}
        <section className="bg-white rounded-3xl border border-[#e5d8d0] p-8 text-left shadow-sm mb-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-black text-[#303330] flex items-center gap-2">
              <Activity size={24} className="text-[#fa7150]" /> Danh Sách Khách Sạn Của Bạn
            </h3>
            <button className="bg-[#fa7150] text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-[#fa7150]/20 hover:scale-[1.02] active:scale-95 transition-transform cursor-pointer">
              <PlusCircle size={16} /> Đăng ký thêm cơ sở
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-[#8a7e75] font-bold text-sm">Đang tải danh sách cơ sở...</div>
          ) : hotels.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-[#e5d8d0] rounded-2xl">
              <p className="text-[#8a7e75] font-bold text-sm mb-4">Bạn chưa đăng ký khách sạn nào hoặc đang chờ phê duyệt.</p>
              <Link to="/" className="text-[#fa7150] font-black text-sm hover:underline">Về Trang Chủ</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="bg-[#fdfaf8] border border-[#e5d8d0] rounded-3xl p-6 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#fa7150]/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-black text-[#303330]">{hotel.name}</h4>
                      <p className="text-xs text-[#8a7e75] mt-1 flex items-center gap-1"><MapPin size={12} className="text-[#fa7150]" /> {hotel.address}</p>
                    </div>
                    <span className="text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider bg-[#d0fac0] text-[#2c4e24]">
                      {hotel.status}
                    </span>
                  </div>

                  {/* Actions for this hotel */}
                  <div className="grid grid-cols-2 gap-4 mt-8 border-t border-[#e5d8d0]/60 pt-6">
                    <Link to={`/partner/hotels/${hotel.id}/rooms`} className="bg-white border border-[#e5d8d0] py-3.5 rounded-full text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] transition-colors flex items-center justify-center gap-1">
                      <Settings size={14} /> Quản lý phòng
                    </Link>
                    <Link to={`/partner/hotels/${hotel.id}/services`} className="bg-white border border-[#e5d8d0] py-3.5 rounded-full text-center font-bold text-xs hover:border-[#fa7150] hover:text-[#fa7150] transition-colors flex items-center justify-center gap-1">
                      <ListOrdered size={14} /> Quản lý dịch vụ
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

    </div>
  )
}
