import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import {
  PawPrint, Building, Calendar, Sparkles, BarChart2, Settings, LogOut, ChevronRight, DollarSign, Users, MessageCircle, Bell
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { MessengerPanel } from '@/components/MessengerPanel'
import { ChatBoxWindow } from '@/components/ChatBoxWindow'
import { useHotelStore } from '@/store/hotelStore'
import { useChatSocket, type MessageResponse } from '@/hooks/useChatSocket'
import axiosInstance from '@/lib/axios'

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
  { icon: <PawPrint size={18} />, label: 'Nhật ký chăm sóc', path: '/partner/diaries', matchPath: '/partner/diaries' },
  { icon: <MessageCircle size={18} />, label: 'Tin nhắn khách hàng', path: '/partner/messages', matchPath: '/partner/messages' },
  { icon: <Settings size={18} />, label: 'Cài Đặt Hệ Thống', path: '/partner/dashboard?tab=settings', matchTab: 'settings' },
  { icon: <Calendar size={18} />, label: 'Danh sách Bookings', path: '/partner/bookings' },
]

const STAFF_NAV_ITEMS: NavItem[] = [
  { icon: <PawPrint size={18} />, label: 'Nhật ký chăm sóc', path: '/partner/diaries', matchPath: '/partner/diaries' },
  { icon: <MessageCircle size={18} />, label: 'Tin nhắn khách hàng', path: '/partner/messages', matchPath: '/partner/messages' },
]

const notifAudio = typeof Audio !== 'undefined' ? new Audio('/notification.mp3') : null
if (notifAudio) {
  notifAudio.preload = 'auto'
}

const playSynthFallback = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.1) // A5

    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880.00, now) // A5
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15) // D6

    gainNode.gain.setValueAtTime(0.08, now)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.35)
    osc2.stop(now + 0.35)
  } catch (e) {
    console.warn('Synthesizer fallback failed:', e)
  }
}

export const PartnerLayout = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { openChatWindows, closeChatWindow, selectedHotelId, setSelectedHotelId } = useHotelStore()
  const searchParams = new URLSearchParams(location.search)
  const currentTab = searchParams.get('tab') || 'hotels'

  const isStaff = user?.role === 'STAFF'
  const isPartner = user?.role === 'PARTNER'
  const NAV_ITEMS = isStaff ? STAFF_NAV_ITEMS : PARTNER_NAV_ITEMS

  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }

  // ── Global System Notification Dropdown States ──
  interface ToastNotification {
    id: string
    title: string
    message: string
    type: 'message' | 'like' | 'comment' | 'booking'
    bookingId?: string
    hotelId?: string
  }
  const [notifications, setNotifications] = useState<ToastNotification[]>(() => {
    const saved = localStorage.getItem('petcare_notifications')
    if (saved) return JSON.parse(saved)
    return []
  })
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [totalUnread, setTotalUnread]             = useState(0)

  // Sync notifications to localStorage
  useEffect(() => {
    localStorage.setItem('petcare_notifications', JSON.stringify(notifications))
  }, [notifications])

  // ── WebSocket setup for global real-time notifications ───────────────────
  const { status, connect, subscribe, subscribeToDestination, disconnect } = useChatSocket()

  // Synthesize soft premium bell/chime ring
  const playNotificationSound = () => {
    if (notifAudio) {
      notifAudio.currentTime = 0
      notifAudio.volume = 0.4
      notifAudio.play().catch(err => {
        console.warn('MP3 play failed, falling back to synth beep:', err)
        playSynthFallback()
      })
    } else {
      playSynthFallback()
    }
  };

  // Load hotels list to initialize selectedHotelId if not already set (PARTNER only)
  useEffect(() => {
    if (!isPartner || selectedHotelId) return
    axiosInstance
      .get('/api/hotels/my', { params: { page: 0, size: 20, sort: [] } })
      .then(res => {
        const list = res.data.content ?? []
        if (list.length > 0) {
          setSelectedHotelId(list[0].id)
        }
      })
      .catch(console.error)
  }, [isPartner, selectedHotelId, setSelectedHotelId])

  // Fetch initial unread message count and connect to socket globally
  useEffect(() => {
    if (isPartner && !selectedHotelId) return
    let unsubs: (() => void)[] = []

    const initSocketNotifications = async () => {
      try {
        const params = isPartner && selectedHotelId ? { hotelId: selectedHotelId } : undefined
        const res = await axiosInstance.get<{ data: any[] }>('/api/conversations/hotel', { params })
        const list = res.data.data ?? []
        
        // Calculate initial total unread messages
        const initialUnread = list.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)
        setTotalUnread(initialUnread)

        // Connect STOMP WebSocket globally
        connect()
      } catch (err) {
        console.error('Failed to init global notifications:', err)
      }
    }

    initSocketNotifications()

    return () => {
      disconnect()
      unsubs.forEach(fn => fn())
    }
  }, [connect, disconnect, selectedHotelId, isPartner])

  // Setup STOMP subscription once connected
  useEffect(() => {
    if (status !== 'connected') return
    if (isPartner && !selectedHotelId) return
    let unsubs: (() => void)[] = []

    // Subscribe to diaries real-time events (likes, comments, creation, etc.)
    const diariesSub = subscribeToDestination('/topic/diaries', (wsMsg: any) => {
      if (wsMsg.hotelId === selectedHotelId) {
        // Dispatch local event for toast notifications & sound in sidebar
        window.dispatchEvent(new CustomEvent('petcare-notification', {
          detail: {
            title: wsMsg.type === 'LIKE' ? 'Yêu thích Nhật ký' : wsMsg.type === 'COMMENT' ? 'Bình luận Nhật ký' : 'Nhật ký mới',
            message: wsMsg.message,
            type: wsMsg.type === 'LIKE' ? 'like' : 'comment',
            bookingId: wsMsg.bookingId,
            hotelId: wsMsg.hotelId
          }
        }))

        // Dispatch local event for StaffDiaryPage to update UI instantly
        window.dispatchEvent(new CustomEvent('petcare-diary-realtime', {
          detail: wsMsg
        }))
      }
    })
    unsubs.push(diariesSub)

    const params = isPartner && selectedHotelId ? { hotelId: selectedHotelId } : undefined
    axiosInstance.get<{ data: any[] }>('/api/conversations/hotel', { params }).then(res => {
      const list = res.data.data ?? []
      list.forEach(c => {
        const fn = subscribe(c.id, (msg: MessageResponse) => {
          // Play sound and pop toast for owner's message
          if (msg.senderRole === 'OWNER') {
            window.dispatchEvent(new CustomEvent('petcare-notification', {
              detail: {
                title: 'Tin nhắn mới từ Chủ nuôi',
                message: msg.content,
                type: 'message',
                bookingId: c.id
              }
            }))
            // Increment unread count
            setTotalUnread(prev => prev + 1)
          }
        })
        unsubs.push(fn)
      })
    }).catch(console.error)

    return () => unsubs.forEach(fn => fn())
  }, [status, subscribe, subscribeToDestination, selectedHotelId, isPartner])

  // Listen to local unread update events from other parts of FE
  useEffect(() => {
    const handleUnreadUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail.unreadCount !== undefined) {
        setTotalUnread(detail.unreadCount)
      }
    }
    const handleNotification = (e: Event) => {
      const detail = (e as CustomEvent).detail
      
      // Nếu chỉ phát âm thanh (nhập chat trực tiếp) -> Không chèn vào danh sách chuông thông báo
      if (detail.soundOnly) {
        playNotificationSound()
        return
      }

      const id = Math.random().toString(36).substring(2, 9)
      const newNotif: ToastNotification = {
        id,
        title: detail.title || 'Thông báo hệ thống',
        message: detail.message || '',
        type: detail.type || 'message',
        bookingId: detail.bookingId,
        hotelId: detail.hotelId
      }
      setNotifications(prev => [newNotif, ...prev])

      // Sound notification alert
      playNotificationSound()
    }

    window.addEventListener('petcare-unread-update', handleUnreadUpdate)
    window.addEventListener('petcare-notification', handleNotification)
    return () => {
      window.removeEventListener('petcare-unread-update', handleUnreadUpdate)
      window.removeEventListener('petcare-notification', handleNotification)
    }
  }, [])

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
        
        {/* Sticky Header Top Bar (Facebook style notifications & messenger icons) */}
        <header className="bg-white border-b border-[#e5d8d0] px-6 py-3 flex items-center justify-between shrink-0 sticky top-0 z-40 bg-white/95 backdrop-blur-sm">
          <div>
            <span className="text-xs font-black text-[#8a7e75] uppercase tracking-widest">
              {location.pathname.includes('/messages') 
                ? 'Tin nhắn khách hàng' 
                : location.pathname.includes('/diaries') 
                  ? 'Nhật ký chăm sóc lưu trú' 
                  : 'Hệ thống Quản lý PetCare Hub'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Messenger Link */}
            <div className="relative">
              <button
                type="button"
                onClick={() => navigate('/partner/messages')}
                className={`w-9 h-9 rounded-full bg-[#faf9f6] border border-[#e5d8d0]/80 flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] hover:border-[#fa7150]/20 transition-all cursor-pointer ${
                  location.pathname === '/partner/messages' ? 'bg-[#fa7150]/15 text-[#fa7150] border-[#fa7150]/30' : ''
                }`}
                title="Tin nhắn"
              >
                <MessageCircle size={16} />
              </button>
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#a43e24] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                  {totalUnread}
                </span>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`w-9 h-9 rounded-full bg-[#faf9f6] border border-[#e5d8d0]/80 flex items-center justify-center text-[#5a5550] hover:text-[#fa7150] hover:border-[#fa7150]/20 transition-all cursor-pointer ${
                  showNotifDropdown ? 'bg-[#fa7150]/15 text-[#fa7150] border-[#fa7150]/30' : ''
                }`}
                title="Thông báo hệ thống"
              >
                <Bell size={16} className={notifications.length > 0 ? 'animate-bounce' : ''} />
              </button>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#a43e24] text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                  {notifications.length}
                </span>
              )}

              {/* Facebook-style Notification Dropdown Tray */}
              {showNotifDropdown && (
                <div 
                  className="fixed right-4 w-80 bg-white border border-[#e5d8d0] rounded-2xl shadow-xl z-50 overflow-hidden text-xs animate-in fade-in slide-in-from-top-2 duration-150"
                  style={{ top: '60px', boxShadow: '0 15px 35px -5px rgba(48,51,48,0.1), 0 10px 15px -5px rgba(0,0,0,0.03)' }}
                >
                  {/* Tray Header */}
                  <div className="px-4 py-3 border-b border-[#e5d8d0] flex justify-between items-center bg-[#faf9f6]">
                    <span className="font-extrabold text-[#303330]">Thông báo của bạn ({notifications.length})</span>
                    {notifications.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setNotifications([])}
                        className="text-[10px] text-[#fa7150] hover:underline font-extrabold cursor-pointer"
                      >
                        Xóa tất cả
                      </button>
                    )}
                  </div>

                  {/* Tray Feed List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#e5d8d0]/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-[#8a7e75] font-bold">
                        <Bell size={24} className="mx-auto mb-2 text-[#e5d8d0]" />
                        Không có thông báo mới nào
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            if (n.hotelId) {
                              setSelectedHotelId(n.hotelId)
                            }
                            if (n.type === 'message') {
                              navigate(`/partner/messages?convId=${n.bookingId}`)
                            } else if (n.type === 'booking') {
                              navigate('/partner/bookings')
                            } else if (n.type === 'like' || n.type === 'comment') {
                              navigate(`/partner/diaries?bookingId=${n.bookingId}`)
                            }
                            // Dismiss clicked notification
                            setNotifications(prev => prev.filter(x => x.id !== n.id))
                            setShowNotifDropdown(false)
                          }}
                          className="p-3.5 hover:bg-[#faf9f6] transition-all flex flex-col cursor-pointer text-left border-l-2 border-transparent hover:border-l-[#fa7150] pl-4"
                        >
                          <span className="text-[9px] font-black text-[#fa7150] uppercase tracking-wider mb-0.5">
                            {n.type === 'message' ? 'Tin nhắn' : n.type === 'booking' ? 'Đơn đặt phòng' : n.type === 'like' ? 'Yêu thích nhật ký' : 'Bình luận nhật ký'}
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
        </header>

        <Outlet />

        {/* Floating docked chat boxes (Facebook-style) */}
        {openChatWindows.map((win, idx) => (
          <ChatBoxWindow
            key={win.conversationId}
            conversationId={win.conversationId}
            bookingId={win.bookingId}
            onClose={() => closeChatWindow(win.conversationId)}
            rightOffset={80 + idx * 340} // Docked next to the floating chatbot icon
          />
        ))}
      </div>
    </div>
  )
}
