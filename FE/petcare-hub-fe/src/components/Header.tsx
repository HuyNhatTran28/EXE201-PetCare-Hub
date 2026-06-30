import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { PawPrint, User, LogOut, Bell } from 'lucide-react'
import { useChatSocket } from '@/hooks/useChatSocket'
import axiosInstance from '@/lib/axios'

export const Header = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)

  const [conversations, setConversations] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>(() => {
    const saved = localStorage.getItem('petcare_client_notifications')
    return saved ? JSON.parse(saved) : []
  })

  // Sync client notifications to localStorage
  useEffect(() => {
    localStorage.setItem('petcare_client_notifications', JSON.stringify(notifications))
  }, [notifications])

  // Fetch initial conversations list for OWNER
  useEffect(() => {
    if (!user || user.role !== 'OWNER') return
    axiosInstance.get('/api/conversations/me')
      .then(res => setConversations(res.data.data ?? []))
      .catch(console.error)
  }, [user])

  const { status, connect, subscribe, subscribeToDestination, disconnect } = useChatSocket()

  // Connect WebSocket
  useEffect(() => {
    if (!user || user.role !== 'OWNER') return
    connect()
    return () => disconnect()
  }, [connect, disconnect, user])

  // Subscribe to each conversation for message count updates
  const convIdsKey = conversations.map(c => c.id).join(',')
  useEffect(() => {
    if (status !== 'connected' || !convIdsKey) return
    const ids = convIdsKey.split(',').filter(Boolean)
    const unsubs = ids.map(id => subscribe(id, (msg: any) => {
      if (msg.senderId !== user?.id) {
        window.dispatchEvent(new CustomEvent('petcare-notification', {
          detail: {
            title: 'Tin nhắn mới từ Cửa hàng',
            message: msg.content,
            type: 'message',
            bookingId: id
          }
        }))
        setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: (c.unreadCount ?? 0) + 1 } : c))
      }
    }))
    return () => unsubs.forEach(fn => fn())
  }, [status, convIdsKey, subscribe, user])

  // Subscribe to diaries real-time events (likes, comments, etc.)
  useEffect(() => {
    if (status !== 'connected' || !user || user.role !== 'OWNER') return

    const unsub = subscribeToDestination('/topic/diaries', (wsMsg: any) => {
      const belongsToMe = conversations.some(c => c.bookingId === wsMsg.bookingId)
      const isNotMe = wsMsg.authorName !== user.fullName

      if (belongsToMe && isNotMe) {
        window.dispatchEvent(new CustomEvent('petcare-notification', {
          detail: {
            title: wsMsg.type === 'COMMENT' ? 'Phản hồi Nhật ký' : 'Nhật ký mới',
            message: wsMsg.message,
            type: wsMsg.type === 'COMMENT' ? 'comment' : 'like',
            bookingId: wsMsg.bookingId
          }
        }))
      }
    })
    return () => unsub()
  }, [status, conversations, subscribeToDestination, user])

  // Sound notification listener
  useEffect(() => {
    const handleNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const id = Math.random().toString(36).substring(2, 9)
      const newNotif = {
        id,
        title: detail.title || 'Thông báo hệ thống',
        message: detail.message || '',
        type: detail.type || 'message',
        bookingId: detail.bookingId
      }
      setNotifications(prev => [newNotif, ...prev])

      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.frequency.setValueAtTime(880, audioCtx.currentTime)
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.3)
      } catch (err) {
        console.warn('Audio play warning:', err)
      }
    }

    window.addEventListener('petcare-notification', handleNotification)
    return () => {
      window.removeEventListener('petcare-notification', handleNotification)
    }
  }, [])

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
          {(!user || user?.role === 'OWNER') && (
            <Link to="/pet-diaries" className={getLinkClass('/pet-diaries')}>
              Nhật ký Thú cưng
            </Link>
          )}
          {(!user || user?.role === 'OWNER') && (
            <Link to="/my-bookings" className={getLinkClass('/my-bookings')}>
              Nhật ký lưu trú
            </Link>
          )}
        </nav>

        {/* User Actions */}
        <div className="flex items-center gap-4 relative">
          
          {/* OWNER specific notifications icon */}
          {user && user.role === 'OWNER' && (
            <div className="flex items-center gap-3 mr-2">
              {/* Notifications Dropdown (Bell Icon) */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="w-10 h-10 rounded-full bg-white border border-[#e5d8d0] flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] hover:border-[#fa7150]/30 transition-all cursor-pointer relative"
                >
                  <Bell size={16} className={notifications.length > 0 ? 'animate-bounce' : ''} />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* Dropdown Tray */}
                {showNotifDropdown && (
                  <div 
                    className="absolute right-0 w-80 bg-white border border-[#e5d8d0] rounded-2xl shadow-xl z-50 overflow-hidden text-xs mt-2 text-left"
                    style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}
                  >
                    <div className="px-4 py-3 border-b border-[#e5d8d0] flex justify-between items-center bg-[#faf9f6]">
                      <span className="font-extrabold text-[#303330]">Thông báo của bạn ({notifications.length})</span>
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => setNotifications([])}
                          className="text-[10px] text-[#fa7150] hover:underline font-extrabold cursor-pointer"
                        >
                          Xóa tất cả
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#e5d8d0]/50">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-[#8a7e75] font-bold">
                          <Bell size={24} className="mx-auto mb-2 text-[#e5d8d0]" />
                          Không có thông báo mới
                        </div>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => {
                              navigate('/pet-diaries')
                              setNotifications(prev => prev.filter(x => x.id !== n.id))
                              setShowNotifDropdown(false)
                            }}
                            className="p-3.5 hover:bg-[#faf9f6] transition-all flex flex-col cursor-pointer text-left border-l-2 border-transparent hover:border-l-[#fa7150] pl-4"
                          >
                            <span className="text-[9px] font-black text-[#fa7150] uppercase tracking-wider mb-0.5">
                              {n.type === 'message' ? 'Tin nhắn' : 'Nhật ký chăm sóc'}
                            </span>
                            <p className="font-extrabold text-[#303330] text-xs">{n.title}</p>
                            <p className="text-[10px] text-[#8a7e75] mt-0.5 leading-snug font-semibold">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

                    {user.role === 'ADMIN' && (
                      <Link 
                        to="/admin/dashboard" 
                        onClick={() => setShowProfileDropdown(false)}
                        className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                      >
                        Trang quản trị (Admin)
                      </Link>
                    )}

                    {user.role === 'STAFF' && (
                      <Link 
                        to="/partner/messages" 
                        onClick={() => setShowProfileDropdown(false)}
                        className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                      >
                        Kênh Nhân Viên (Staff)
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
