import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  PawPrint, LayoutDashboard, Building, Users,
  Tag, BarChart2, FileText, LogOut, ChevronRight,
  Settings, Shield, DollarSign, MessageSquare, Flag, Bell
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'

interface NotificationItem {
  id: string
  message: string
  path: string
  icon: any
  count: number
}

const AdminNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const loadNotificationData = async () => {
    setLoading(true)
    try {
      // 1. Fetch pending hotels
      let pendingHotels = 0
      try {
        const res = await axiosInstance.get('/api/admin/hotels/pending')
        pendingHotels = res.data?.totalElements || res.data?.content?.length || res.data?.length || 0
      } catch (e) {
        console.error('Failed to load pending hotels', e)
      }

      // 2. Fetch pending reports
      let pendingReports = 0
      try {
        const res = await axiosInstance.get('/api/admin/reports')
        const allReports = res.data || []
        pendingReports = allReports.filter((r: any) => r.status === 'PENDING').length
      } catch (e) {
        console.error('Failed to load reports', e)
      }

      // 3. Fetch pending withdrawals
      let pendingWithdrawals = 0
      try {
        const res = await axiosInstance.get('/api/admin/withdrawals')
        const allWithdrawals = res.data || []
        pendingWithdrawals = allWithdrawals.filter((w: any) => w.status === 'PENDING').length
      } catch (e) {
        console.error('Failed to load withdrawals', e)
      }

      // 4. Fetch feedbacks
      let feedbackCount = 0
      try {
        const res = await axiosInstance.get('/api/admin/feedbacks')
        feedbackCount = (res.data || []).length
      } catch (e) {
        console.error('Failed to load feedbacks', e)
      }

      const activeList: NotificationItem[] = []
      if (pendingHotels > 0) {
        activeList.push({
          id: 'hotels',
          message: `Có ${pendingHotels} đối tác khách sạn mới đang chờ phê duyệt đăng ký.`,
          path: '/admin/hotels',
          icon: <Building size={16} className="text-amber-500" />,
          count: pendingHotels
        })
      }
      if (pendingReports > 0) {
        activeList.push({
          id: 'reports',
          message: `Có ${pendingReports} báo cáo vi phạm khách sạn mới cần kiểm tra.`,
          path: '/admin/reports',
          icon: <Flag size={16} className="text-rose-500" />,
          count: pendingReports
        })
      }
      if (pendingWithdrawals > 0) {
        activeList.push({
          id: 'withdrawals',
          message: `Có ${pendingWithdrawals} yêu cầu rút tiền của đối tác đang chờ đối soát.`,
          path: '/admin/withdrawals',
          icon: <DollarSign size={16} className="text-emerald-500" />,
          count: pendingWithdrawals
        })
      }
      if (feedbackCount > 0) {
        activeList.push({
          id: 'feedbacks',
          message: `Hệ thống ghi nhận ${feedbackCount} ý kiến đóng góp/góp ý mới từ người dùng.`,
          path: '/admin/feedbacks',
          icon: <MessageSquare size={16} className="text-blue-500" />,
          count: feedbackCount
        })
      }

      setNotifications(activeList)
    } catch (err) {
      console.error('Failed to build admin notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotificationData()
    // Poll every 45 seconds
    const interval = setInterval(loadNotificationData, 45000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = (path: string) => {
    setIsOpen(false)
    navigate(path)
  }

  const totalCount = notifications.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-full hover:bg-[#faf9f6] text-[#8a7e75] hover:text-[#fa7150] transition-colors border border-[#e5d8d0] bg-white cursor-pointer flex items-center justify-center shadow-sm"
      >
        <Bell size={18} />
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#fa7150] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white animate-bounce">
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-3xl border border-[#e5d8d0] shadow-2xl z-[9999] py-4 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-5 pb-3 border-b border-[#e5d8d0]/60 flex items-center justify-between">
            <span className="text-xs font-black text-[#303330] uppercase tracking-wider">Thông báo hệ thống</span>
            <button
              onClick={loadNotificationData}
              disabled={loading}
              className="text-[10px] font-bold text-[#fa7150] hover:underline cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-[#e5d8d0]/40">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-400 font-bold text-[11px]">
                <Bell size={24} className="mx-auto mb-2 text-[#e5d8d0]" />
                Không có hoạt động cần xử lý.
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.path)}
                  className="px-5 py-3.5 hover:bg-[#faf9f6] cursor-pointer transition-colors flex gap-3 items-start"
                >
                  <div className="p-2 bg-[#faf9f6] rounded-xl border border-[#e5d8d0] shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-[#5a5550] font-bold leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[9px] font-black text-[#fa7150] uppercase tracking-wider block">
                      Đi đến trang xử lý &rarr;
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label: 'Bảng điều khiển', path: '/admin/dashboard' },
  { icon: <Building size={18}/>, label: 'Quản lý Khách Sạn', path: '/admin/hotels' },
  { icon: <Users size={18}/>, label: 'Quản lý Người dùng', path: '/admin/users' },
  { icon: <Tag size={18}/>, label: 'Marketing & Voucher', path: '/admin/marketing' },
  { icon: <BarChart2 size={18}/>, label: 'Phân tích & Báo cáo', path: '/admin/analytics' },
  { icon: <DollarSign size={18}/>, label: 'Duyệt Rút Tiền', path: '/admin/withdrawals' },
  { icon: <MessageSquare size={18}/>, label: 'Ý kiến đóng góp', path: '/admin/feedbacks' },
  { icon: <Flag size={18}/>, label: 'Báo cáo Vi phạm', path: '/admin/reports' },
  { icon: <FileText size={18}/>, label: 'Nhật ký Hệ thống', path: '/admin/audit' },
  { icon: <Shield size={18}/>, label: 'Phân quyền', path: '/admin/permissions' },
]

export const AdminLayout = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] font-sans flex text-left">

      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-[#e5d8d0] flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen overflow-y-auto">
        <div className="space-y-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={orangeGradient}>
              <PawPrint size={22} />
            </div>
            <div>
              <span className="text-lg font-black block">PetCare Hub</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150]">ADMIN CONSOLE</span>
            </div>
          </Link>

          {/* User info */}
          <div className="bg-[#faf9f6] p-4 rounded-2xl flex items-center gap-3 border border-[#e5d8d0]">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-sm font-black text-red-600">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
              <span className="text-sm font-bold block truncate">{user?.fullName || 'Admin'}</span>
              <span className="text-[10px] font-semibold text-[#8a7e75] truncate block">{user?.email}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {NAV.map(item => {
              const active = location.pathname === item.path
              return (
                <Link key={item.path} to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                    active
                      ? 'bg-[#fa7150]/10 text-[#fa7150]'
                      : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
                  }`}
                >
                  <span className="flex items-center gap-3">{item.icon}{item.label}</span>
                  <ChevronRight size={14} className={active ? 'opacity-100' : 'opacity-30'} />
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Footer */}
        <div className="space-y-2 pt-6 border-t border-[#e5d8d0]">
          <Link to="/admin/settings"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-xs text-[#5a5550] hover:bg-[#faf9f6] transition-all"
          >
            <Settings size={18} /> Cài đặt
          </Link>
          <button onClick={() => { logout(); navigate('/login') }}
            className="w-full py-3 px-4 rounded-2xl border border-red-100 text-red-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 transition-all"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-grow overflow-y-auto flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-[#e5d8d0] bg-white px-8 flex items-center justify-between sticky top-0 z-40 shrink-0 select-none">
          <div className="flex items-center gap-2.5 text-left">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-[10px] font-black uppercase text-[#8a7e75] tracking-wider">Hệ thống giám sát thời gian thực</span>
          </div>
          <div className="flex items-center gap-4">
            <AdminNotifications />
          </div>
        </header>
        <div className="flex-grow">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
