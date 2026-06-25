import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  PawPrint, LayoutDashboard, Building, Users,
  Tag, BarChart2, FileText, LogOut, ChevronRight,
  Settings, Shield, DollarSign, MessageSquare
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const NAV = [
  { icon: <LayoutDashboard size={18}/>, label: 'Bảng điều khiển', path: '/admin/dashboard' },
  { icon: <Building size={18}/>, label: 'Quản lý Khách Sạn', path: '/admin/hotels' },
  { icon: <Users size={18}/>, label: 'Quản lý Người dùng', path: '/admin/users' },
  { icon: <Tag size={18}/>, label: 'Marketing & Voucher', path: '/admin/marketing' },
  { icon: <BarChart2 size={18}/>, label: 'Phân tích & Báo cáo', path: '/admin/analytics' },
  { icon: <DollarSign size={18}/>, label: 'Duyệt Rút Tiền', path: '/admin/withdrawals' },
  { icon: <MessageSquare size={18}/>, label: 'Ý kiến đóng góp', path: '/admin/feedbacks' },
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
      <main className="flex-grow overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
