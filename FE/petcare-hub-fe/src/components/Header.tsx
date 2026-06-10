import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PawPrint, User, LogOut } from 'lucide-react'

export const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Active page helpers
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const getLinkClass = (path: string) => {
    const base = 'text-sm font-semibold transition-all duration-200 relative py-1'
    if (isActive(path)) {
      return `${base} text-[#fa7150] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#fa7150] after:rounded-full`
    }
    return `${base} text-[#5a5550] hover:text-[#fa7150]`
  }

  return (
    <header className="sticky top-0 z-50 bg-[#fcf8f5]/90 backdrop-blur-md border-b border-[#f0e4de] px-6 py-4 w-full shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <PawPrint size={28} className="text-[#fa7150] animate-bounce" />
          <span className="text-xl font-black tracking-tight text-[#303330]">
            PetCare Hub
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className={getLinkClass('/')}>
            Trang chủ
          </Link>
          <Link to="/hotels" className={getLinkClass('/hotels')}>
            Đặt phòng
          </Link>
          <Link to="/route-search" className={getLinkClass('/route-search')}>
            Tìm theo tuyến đường
          </Link>
          {user?.role === 'OWNER' && (
            <Link to="/pets" className={getLinkClass('/pets')}>
              Nhật ký Thú cưng
            </Link>
          )}
          {user && (
            <Link to="/my-bookings" className={getLinkClass('/my-bookings')}>
              Nhật ký lưu trú
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-4 relative">
          {user ? (
            <div className="relative">
              <div 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#fa7150] to-[#ff9880] text-white flex items-center justify-center shadow-md cursor-pointer hover:scale-105 hover:shadow-[#fa7150]/20 active:scale-95 transition-all select-none border-2 border-white"
                title="Tài khoản cá nhân"
              >
                <User size={18} />
              </div>

              {/* Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-3xl border border-[#e5d8d0] shadow-2xl p-4 text-left z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Account Information */}
                  <div className="pb-3 border-b border-[#e5d8d0]/60 mb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#fdf0ec] text-[#fa7150] flex items-center justify-center border border-[#fa7150]/20 shrink-0">
                      <User size={18} />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-black text-[#fa7150] uppercase tracking-wider">{user.role}</p>
                      <p className="text-sm font-bold text-[#303330] line-clamp-1 mt-0.5">{user.fullName}</p>
                      <p className="text-[10px] text-[#8a7e75] line-clamp-1">{user.email}</p>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="flex flex-col gap-1 mb-3">
                    {user.role === 'OWNER' && (
                      <>
                        <Link 
                          to="/pets" 
                          onClick={() => setShowProfileDropdown(false)}
                          className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                        >
                          Hồ sơ Thú cưng
                        </Link>
                        <Link 
                          to="/my-bookings" 
                          onClick={() => setShowProfileDropdown(false)}
                          className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                        >
                          Lịch đặt phòng
                        </Link>
                      </>
                    )}

                    {user.role === 'PARTNER' && (
                      <Link 
                        to="/partner/dashboard" 
                        onClick={() => setShowProfileDropdown(false)}
                        className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                      >
                        Kênh Đối Tác (Partner)
                      </Link>
                    )}

                    <Link 
                      to="/profile" 
                      onClick={() => setShowProfileDropdown(false)}
                      className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                    >
                      Thông tin cá nhân
                    </Link>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                    className="w-full bg-[#fa7150]/10 hover:bg-[#fa7150] text-[#fa7150] hover:text-white px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer"
                  >
                    <LogOut size={14} className="mr-2" />
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-bold text-[#303330] hover:text-[#fa7150] transition-colors"
            >
              Đăng nhập
            </Link>
          )}

          <Link
            to="/hotels"
            className="hidden sm:inline-flex px-6 py-2.5 rounded-full text-sm font-bold text-white shadow-lg shadow-[#fa7150]/20 hover:shadow-[#fa7150]/40 transition-all hover:scale-[1.02] cursor-pointer"
            style={{ backgroundColor: '#a43e24' }}
          >
            Đặt hẹn ngay
          </Link>
        </div>
      </div>
    </header>
  )
}
