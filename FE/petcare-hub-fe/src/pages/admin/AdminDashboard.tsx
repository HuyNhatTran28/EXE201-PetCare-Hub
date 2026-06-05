import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building, Users, Calendar, TrendingUp,
  Clock, CheckCircle, AlertCircle, MapPin,
  ArrowRight
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

export const AdminDashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ active: 0, pending: 0, users: 0, bookings: 0 })
  const [pendingHotels, setPendingHotels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [allRes, pendingRes] = await Promise.all([
          axiosInstance.get('/api/hotels', { params: { page: 0, size: 100 } }),
          axiosInstance.get('/api/hotels', { params: { status: 'PENDING', page: 0, size: 5 } }),
        ])
        const all = allRes.data.content || []
        const pending = pendingRes.data.content || []
        setStats({
          active: all.filter((h: any) => h.status === 'ACTIVE').length,
          pending: pending.length,
          users: 0,
          bookings: 0,
        })
        setPendingHotels(pending)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  const STATS = [
    { icon: <Building size={22} />, label: 'KS đang hoạt động', value: stats.active, color: 'text-blue-600', bg: 'bg-blue-50', path: '/admin/hotels' },
    { icon: <Clock size={22} />, label: 'KS chờ duyệt', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50', path: '/admin/hotels' },
    { icon: <Users size={22} />, label: 'Người dùng', value: '—', color: 'text-purple-600', bg: 'bg-purple-50', path: '/admin/users' },
    { icon: <Calendar size={22} />, label: 'Booking hôm nay', value: '—', color: 'text-green-600', bg: 'bg-green-50', path: '/admin/analytics' },
  ]

  return (
    <div className="p-10 text-left">

      {/* Header */}
      <div className="mb-10">
        <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Admin Console</span>
        <h1 className="text-4xl font-black text-[#303330] mt-1">Tổng quan hệ thống</h1>
        <p className="text-[#8a7e75] text-sm mt-1">Giám sát và quản trị toàn bộ nền tảng PetCare Hub</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {STATS.map((s, i) => (
          <div key={i} onClick={() => navigate(s.path)}
            className="bg-white p-6 rounded-3xl border border-[#e5d8d0] cursor-pointer hover:-translate-y-1 hover:shadow-lg transition-all"
            style={cardShadow}
          >
            <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              {s.icon}
            </div>
            <span className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider block mb-1">{s.label}</span>
            <span className="text-3xl font-black text-[#303330]">{loading ? '...' : s.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* KS chờ duyệt */}
        <div className="bg-white rounded-3xl border border-[#e5d8d0] p-8" style={cardShadow}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#303330] flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" />
              Khách sạn chờ duyệt
            </h2>
            <button onClick={() => navigate('/admin/hotels')}
              className="text-xs font-bold text-[#fa7150] hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center">
              <span className="w-6 h-6 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
            </div>
          ) : pendingHotels.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-[#8a7e75] text-sm font-bold">Không có KS nào chờ duyệt</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingHotels.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-4 bg-[#faf9f6] rounded-2xl border border-[#e5d8d0]">
                  <div>
                    <p className="font-black text-sm text-[#303330]">{h.name}</p>
                    <p className="text-[10px] text-[#8a7e75] flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {h.address || 'Chưa có địa chỉ'}
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    CHỜ DUYỆT
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-3xl border border-[#e5d8d0] p-8" style={cardShadow}>
          <h2 className="text-lg font-black text-[#303330] mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#fa7150]" />
            Thao tác nhanh
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Duyệt khách sạn mới', desc: `${stats.pending} KS đang chờ`, path: '/admin/hotels', color: 'bg-amber-50 text-amber-700' },
              { label: 'Tạo voucher khuyến mãi', desc: 'Marketing & ưu đãi', path: '/admin/marketing', color: 'bg-purple-50 text-purple-700' },
              { label: 'Xem báo cáo doanh thu', desc: 'Phân tích & thống kê', path: '/admin/analytics', color: 'bg-blue-50 text-blue-700' },
              { label: 'Quản lý tài khoản', desc: 'OWNER, PARTNER, STAFF', path: '/admin/users', color: 'bg-green-50 text-green-700' },
            ].map((item, i) => (
              <button key={i} onClick={() => navigate(item.path)}
                className="w-full flex items-center justify-between p-4 bg-[#faf9f6] rounded-2xl border border-[#e5d8d0] hover:border-[#fa7150]/40 hover:bg-white transition-all text-left"
              >
                <div>
                  <p className="font-black text-sm text-[#303330]">{item.label}</p>
                  <p className="text-[10px] text-[#8a7e75] mt-0.5">{item.desc}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${item.color}`}>
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
