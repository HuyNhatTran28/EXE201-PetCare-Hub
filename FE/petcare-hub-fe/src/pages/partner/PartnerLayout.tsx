import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  PawPrint, Building, Calendar, Sparkles, BarChart2, Settings, LogOut, ChevronRight, DollarSign, Users, MessageCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

interface NavItem {
  icon: React.ReactNode
  label: string
  path: string
  matchTab?: string
  matchPath?: string
}

const PARTNER_NAV_ITEMS: NavItem[] = [
  { icon: <Building size={18} />, label: 'Quản Lý Khách Sạn', path: '/partner/dashboard?tab=hotels', matchTab: 'hotels' },
  { icon: <Calendar size={18} />, label: 'Đặt Chỗ & Lịch Trình', path: '/partner/dashboard?tab=bookings', matchTab: 'bookings' },
  { icon: <Sparkles size={18} />, label: 'Quy trình Không giấy tờ', path: '/partner/dashboard?tab=paperless', matchTab: 'paperless' },
  { icon: <BarChart2 size={18} />, label: 'Phân Tích & CRM', path: '/partner/dashboard?tab=analytics', matchTab: 'analytics' },
  { icon: <DollarSign size={18} />, label: 'Quản Lý Tài Chính', path: '/partner/dashboard?tab=finance', matchTab: 'finance' },
  { icon: <Users size={18} />, label: 'Quản Lý Nhân Viên', path: '/partner/staff', matchPath: '/partner/staff' },
  { icon: <MessageCircle size={18} />, label: 'Tin Nhắn', path: '/partner/messages', matchPath: '/partner/messages' },
  { icon: <Settings size={18} />, label: 'Cài Đặt Hệ Thống', path: '/partner/dashboard?tab=settings', matchTab: 'settings' },
  { icon: <Calendar size={18} />, label: 'Danh sách Bookings', path: '/partner/bookings' },
]

const STAFF_NAV_ITEMS: NavItem[] = [
  { icon: <MessageCircle size={18} />, label: 'Tin Nhắn', path: '/partner/messages', matchPath: '/partner/messages' },
]

export const PartnerLayout = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const currentTab = searchParams.get('tab') || 'hotels'

  const isStaff = user?.role === 'STAFF'
  const NAV_ITEMS = isStaff ? STAFF_NAV_ITEMS : PARTNER_NAV_ITEMS

  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }

  const isActive = (item: NavItem) => {
    if (item.matchPath) {
      return location.pathname === item.matchPath
    }
    if (item.path.startsWith('/partner/dashboard')) {
      return location.pathname === '/partner/dashboard' && currentTab === item.matchTab
    }
    return location.pathname === item.path
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans flex flex-col md:flex-row">
      
      {/* ── SIDEBAR NAVIGATION ── */}
      <aside className="w-full md:w-80 bg-white border-r border-[#e5d8d0] flex flex-col justify-between p-6 shrink-0 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.01)] h-screen sticky top-0 overflow-y-hidden">
        
        {/* Top Scrollable Area */}
        <div className="flex-grow overflow-y-auto space-y-10 pr-1 select-none">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0" style={orangeGradient}>
              <PawPrint size={22} />
            </div>
            <div className="text-left">
              <span className="text-lg font-black tracking-tight block">PetCare Hub</span>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150]">RESORT CONSOLE</span>
            </div>
          </Link>

          {/* User Brief */}
          <div className="bg-[#faf9f6] p-4 rounded-2xl flex items-center gap-3 border border-[#e5d8d0]/60">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-[#e5d8d0] text-sm font-black text-[#fa7150] shrink-0">
              {user?.fullName?.charAt(0) || 'P'}
            </div>
            <div className="text-left overflow-hidden">
              <span className="text-sm font-bold text-[#303330] block truncate">{user?.fullName || 'Đối tác'}</span>
              <span className="text-[10px] font-semibold text-[#8a7e75] block truncate">{user?.email || 'partner@gmail.com'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {NAV_ITEMS.map((item, index) => {
              const active = isActive(item)
              return (
                <Link
                  key={index}
                  to={item.path}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-xs transition-all ${
                    active
                      ? 'bg-[#fa7150]/10 text-[#fa7150] shadow-sm'
                      : 'text-[#5a5550] hover:bg-[#faf9f6] hover:text-[#303330]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon} {item.label}
                  </span>
                  <ChevronRight size={14} className={active ? 'opacity-100' : 'opacity-0'} />
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Fixed Logout Button at Bottom */}
        <div className="pt-6 border-t border-[#e5d8d0]/60 mt-auto shrink-0 bg-white">
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full py-3 px-4 rounded-2xl border border-red-100 text-red-500 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-50 transition-all cursor-pointer"
          >
            <LogOut size={16} /> Đăng xuất đối tác
          </button>
        </div>
      </aside>

      {/* ── WORKSPACE CONTENT ── */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}
