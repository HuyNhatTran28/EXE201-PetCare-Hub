import { useState, useEffect } from 'react'
import {
  TrendingUp, DollarSign, Building, Users,
  Calendar, CheckCircle, Clock, XCircle,
  PawPrint, BarChart2
} from 'lucide-react'
import axiosInstance from '@/lib/axios'

export const AnalyticsPage = () => {
  const [stats, setStats] = useState<any>(null)
  const [bookingStats, setBookingStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, bookingRes] = await Promise.all([
          axiosInstance.get('/api/admin/stats'),
          axiosInstance.get('/api/admin/stats/bookings'),
        ])
        setStats(statsRes.data)
        setBookingStats(bookingRes.data)
      } catch (err) {
        console.error('Failed to load analytics', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cardShadow = { boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }

  const MAIN_STATS = [
    { icon: <Users size={24}/>, label: 'Tổng người dùng', value: stats?.totalUsers, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: <Building size={24}/>, label: 'KS đang hoạt động', value: stats?.activeHotels, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: <Calendar size={24}/>, label: 'Tổng booking', value: stats?.totalBookings, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: <DollarSign size={24}/>, label: 'Doanh thu (đã hoàn thành)', value: stats?.totalRevenue
        ? Number(stats.totalRevenue).toLocaleString('vi-VN') + 'đ'
        : '0đ', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  const BOOKING_STATS = [
    { label: 'Chờ thanh toán', key: 'PENDING',    color: 'bg-amber-500',   icon: <Clock size={16}/> },
    { label: 'Đã xác nhận',   key: 'CONFIRMED',   color: 'bg-blue-500',    icon: <CheckCircle size={16}/> },
    { label: 'Đang lưu trú',  key: 'CHECKED_IN',  color: 'bg-purple-500',  icon: <PawPrint size={16}/> },
    { label: 'Hoàn tất',      key: 'COMPLETED',   color: 'bg-emerald-500', icon: <CheckCircle size={16}/> },
    { label: 'Đã hủy',        key: 'CANCELLED',   color: 'bg-rose-500',    icon: <XCircle size={16}/> },
  ]

  const totalBookings = bookingStats
    ? Object.values(bookingStats).reduce((a: any, b: any) => a + b, 0) as number
    : 0

  return (
    <div className="p-10 min-h-screen">

      {/* Header */}
      <div className="mb-10">
        <span className="text-[#fa7150] text-xs font-black uppercase tracking-widest">Admin Console</span>
        <h1 className="text-4xl font-black text-[#303330] mt-1">Phân tích & Báo cáo</h1>
        <p className="text-[#8a7e75] text-sm mt-1">Tổng quan hiệu suất hoạt động của nền tảng</p>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {MAIN_STATS.map((s, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-[#e5d8d0]" style={cardShadow}>
            <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
              {s.icon}
            </div>
            <span className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider block mb-1">{s.label}</span>
            <span className="text-2xl font-black text-[#303330]">
              {loading ? '...' : s.value ?? '—'}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Booking by status */}
        <div className="bg-white rounded-3xl border border-[#e5d8d0] p-8" style={cardShadow}>
          <h2 className="text-lg font-black text-[#303330] mb-6 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#fa7150]" />
            Phân bố booking theo trạng thái
          </h2>

          {loading ? (
            <div className="py-12 text-center">
              <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
            </div>
          ) : (
            <div className="space-y-4">
              {BOOKING_STATS.map((s, i) => {
                const count = bookingStats?.[s.key] || 0
                const pct = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-2 text-xs font-bold text-[#5a5550]">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        {s.label}
                      </span>
                      <span className="text-xs font-black text-[#303330]">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2.5 bg-[#f2f2f2] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              <div className="pt-4 border-t border-[#e5d8d0] flex justify-between items-center">
                <span className="text-xs font-bold text-[#8a7e75]">Tổng booking</span>
                <span className="text-xl font-black text-[#303330]">{totalBookings}</span>
              </div>
            </div>
          )}
        </div>

        {/* Hotel stats */}
        <div className="bg-white rounded-3xl border border-[#e5d8d0] p-8" style={cardShadow}>
          <h2 className="text-lg font-black text-[#303330] mb-6 flex items-center gap-2">
            <Building size={20} className="text-[#fa7150]" />
            Thống kê khách sạn
          </h2>

          {loading ? (
            <div className="py-12 text-center">
              <span className="w-8 h-8 rounded-full border-4 border-[#fa7150]/20 border-t-[#fa7150] animate-spin inline-block" />
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Tổng KS đăng ký', value: stats?.totalHotels || 0, color: 'bg-blue-500', pct: 100 },
                { label: 'Đang hoạt động', value: stats?.activeHotels || 0, color: 'bg-emerald-500',
                  pct: stats?.totalHotels ? Math.round((stats.activeHotels/stats.totalHotels)*100) : 0 },
                { label: 'Chờ duyệt', value: (stats?.totalHotels||0) - (stats?.activeHotels||0), color: 'bg-amber-500',
                  pct: stats?.totalHotels ? Math.round(((stats.totalHotels-stats.activeHotels)/stats.totalHotels)*100) : 0 },
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 text-xs font-bold text-[#5a5550]">
                      <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      {s.label}
                    </span>
                    <span className="text-xs font-black text-[#303330]">{s.value} ({s.pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-[#f2f2f2] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.color}`} style={{width:`${s.pct}%`}} />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-[#e5d8d0]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#faf9f6] p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-[#8a7e75] uppercase mb-1">Tổng KS</p>
                    <p className="text-2xl font-black text-[#303330]">{stats?.totalHotels || 0}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-[#8a7e75] uppercase mb-1">Đang HĐ</p>
                    <p className="text-2xl font-black text-emerald-700">{stats?.activeHotels || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Revenue summary */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#e5d8d0] p-8" style={cardShadow}>
          <h2 className="text-lg font-black text-[#303330] mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#fa7150]" />
            Tóm tắt doanh thu
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: 'Doanh thu từ booking hoàn thành', value: stats?.totalRevenue
                  ? Number(stats.totalRevenue).toLocaleString('vi-VN') + 'đ'
                  : '0đ', color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Booking đã hoàn thành', value: bookingStats?.COMPLETED || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Tỷ lệ hoàn thành', value: totalBookings > 0
                  ? Math.round(((bookingStats?.COMPLETED||0)/totalBookings)*100) + '%'
                  : '0%', color: 'text-purple-700', bg: 'bg-purple-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} p-6 rounded-2xl`}>
                <p className="text-[10px] font-black text-[#8a7e75] uppercase tracking-wider mb-2">{s.label}</p>
                <p className={`text-2xl font-black ${s.color}`}>{loading ? '...' : s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
