import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/authStore'
import { PawPrint, User, LogOut, Bell } from 'lucide-react'
import { useChatSocket } from '@/hooks/useChatSocket'
import axiosInstance from '@/lib/axios'

const notifAudio = typeof Audio !== 'undefined' ? new Audio('/notification.mp3') : null
if (notifAudio) {
  notifAudio.preload = 'auto'
}

const playSynthFallback = () => {
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
  } catch (e) {
    console.warn('Synthesizer fallback failed:', e)
  }
}

export const Header = () => {
  const { user, logout, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)

  // ── Profile Modal States ──
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    address: ''
  })

  // Password States inside modal
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [passLoading, setPassLoading] = useState(false)

  // Otp timer effect
  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setInterval(() => {
      setOtpCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCountdown])

  const handleSendOtp = async () => {
    setPassError('')
    setPassSuccess('')
    setIsSendingOtp(true)
    try {
      await axiosInstance.post('/api/auth/change-password/otp')
      setPassSuccess('Mã OTP xác thực đã được gửi về Email đăng ký của bạn.')
      setOtpCountdown(60)
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại sau.')
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError('')
    setPassSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword || !otpCode) {
      setPassError('Vui lòng điền đầy đủ thông tin.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu mới và xác nhận không trùng khớp.')
      return
    }

    setPassLoading(true)
    try {
      await axiosInstance.post('/api/auth/change-password', {
        oldPassword,
        newPassword,
        otpCode
      })
      setPassSuccess('Đổi mật khẩu thành công!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setOtpCode('')
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra thông tin và mã OTP.')
    } finally {
      setPassLoading(false)
    }
  }

  const openProfileModal = () => {
    setProfileForm({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      address: user?.address || ''
    })
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setOtpCode('')
    setPassError('')
    setPassSuccess('')
    setActiveTab('info')
    setShowProfileModal(true)
    setShowProfileDropdown(false)
  }

  useEffect(() => {
    if (showProfileModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showProfileModal])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.fullName.trim()) {
      alert('Vui lòng nhập Họ và tên!')
      return
    }
    if (!profileForm.phone.trim()) {
      alert('Vui lòng nhập Số điện thoại!')
      return
    }
    updateUser({
      fullName: profileForm.fullName,
      phone: profileForm.phone,
      address: profileForm.address
    })
    alert('Cập nhật thông tin liên hệ thành công!')
    setShowProfileModal(false)
  }

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
    }

    window.addEventListener('petcare-notification', handleNotification)
    return () => {
      window.removeEventListener('petcare-notification', handleNotification)
    }
  }, [])

  // Periodic check for owner's report status updates to notify the owner
  useEffect(() => {
    if (!user || user.role !== 'OWNER') return

    const checkReportStatusUpdates = async () => {
      try {
        const res = await axiosInstance.get('/api/reports/me')
        const reportsList = res.data || []

        reportsList.forEach((rep: any) => {
          const status = rep.status
          if (status === 'APPROVED' || status === 'REJECTED') {
            const notifKey = `report-notified-${rep.id}-${status}`
            const alreadyNotified = localStorage.getItem(notifKey)
            
            if (!alreadyNotified) {
              const newTitle = 'Cập nhật báo cáo vi phạm'
              const newMsg = status === 'APPROVED'
                ? `Báo cáo của bạn về cơ sở "${rep.hotelName}" đã được phê duyệt. Cơ sở này đã bị đình chỉ hoạt động.`
                : `Báo cáo của bạn về cơ sở "${rep.hotelName}" đã bị từ chối. Lý do: ${rep.adminNote || 'Không có lý do cụ thể.'}`

              // Add notification locally
              const id = Math.random().toString(36).substring(2, 9)
              const newNotif = {
                id,
                title: newTitle,
                message: newMsg,
                type: 'message',
                createdAt: new Date().toISOString()
              }
              setNotifications(prev => [newNotif, ...prev])

              // Play sound
              if (notifAudio) {
                notifAudio.currentTime = 0
                notifAudio.volume = 0.4
                notifAudio.play().catch(console.warn)
              } else {
                playSynthFallback()
              }

              // Save to localStorage so it doesn't notify again
              localStorage.setItem(notifKey, 'true')
            }
          }
        })
      } catch (err) {
        console.error('Failed to check report status updates:', err)
      }
    }

    checkReportStatusUpdates()
    const interval = setInterval(checkReportStatusUpdates, 20000)
    return () => clearInterval(interval)
  }, [user])

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
                  <div
                    onClick={openProfileModal}
                    className="pb-3 border-b border-[#e5d8d0]/60 mb-3 flex items-center gap-3 hover:bg-[#fa7150]/5 p-2 rounded-2xl cursor-pointer transition-all group"
                    title="Cập nhật thông tin liên hệ"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#fdf0ec] text-[#fa7150] flex items-center justify-center border border-[#fa7150]/20 shrink-0">
                      <User size={18} />
                    </div>
                    <div className="flex-grow min-w-0 text-left">
                      <p className="text-xs font-black text-[#fa7150] uppercase tracking-wider">{user.role}</p>
                      <p className="text-sm font-bold text-[#303330] line-clamp-1 mt-0.5 group-hover:text-[#fa7150] transition-colors">{user.fullName}</p>
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
                        <Link 
                          to="/profile" 
                          onClick={() => setShowProfileDropdown(false)}
                          className="px-3.5 py-2.5 rounded-2xl hover:bg-[#fff0e6] hover:text-[#fa7150] text-xs font-bold text-[#5a5550] transition-all flex items-center"
                        >
                          Ưu đãi & Điểm thưởng
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

                    {/* No button, edit profile is triggered by user card click at the top */}
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
       {/* ── PROFILE UPDATE MODAL ── */}
      {showProfileModal && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl text-left border border-[#e5d8d0] animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-black text-[#303330] mb-2">Tài khoản & Thiết lập</h3>
            <p className="text-xs text-[#8a7e75] mb-6">Quản lý thông tin liên lạc cá nhân hoặc thiết lập lại mật khẩu bảo vệ tài khoản.</p>
            
            {/* Tab Switcher */}
            <div className="flex bg-[#faf9f6] p-1 rounded-xl mb-6 border border-[#e5d8d0]/60">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'info'
                    ? 'bg-[#fa7150] text-white shadow-sm'
                    : 'text-[#8a7e75] hover:text-[#fa7150]'
                }`}
              >
                Thông tin cá nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'password'
                    ? 'bg-[#fa7150] text-white shadow-sm'
                    : 'text-[#8a7e75] hover:text-[#fa7150]'
                }`}
              >
                Đổi mật khẩu
              </button>
            </div>

            {activeTab === 'info' && (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Email (Không thể thay đổi)</label>
                  <input
                    type="text"
                    disabled
                    value={user?.email || ''}
                    className="w-full border border-[#e5d8d0] bg-[#faf9f6] text-[#8a7e75] rounded-2xl px-4 py-3 text-sm outline-none cursor-not-allowed font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.fullName}
                    onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                    placeholder="Nhập họ và tên của bạn"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={e => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11)
                      setProfileForm({ ...profileForm, phone: val })
                    }}
                    placeholder="Nhập số điện thoại liên lạc"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Địa chỉ liên hệ</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="Số nhà, Tên đường, Quận/Huyện..."
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="flex-grow py-3 rounded-2xl bg-[#fa7150] hover:bg-[#a43e24] text-white text-sm font-bold transition-colors text-center cursor-pointer"
                  >
                    Lưu thông tin
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passError && <div className="text-xs font-bold text-rose-500">{passError}</div>}
                {passSuccess && <div className="text-xs font-bold text-emerald-600">{passSuccess}</div>}
                
                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mật khẩu cũ *</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Xác nhận mật khẩu mới *</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu mới"
                    className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none focus:border-[#fa7150]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8a7e75] uppercase mb-1 block">Mã xác thực OTP (Kiểm tra Email)</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      required
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="Nhập mã OTP 6 số"
                      className="w-full border border-[#e5d8d0] rounded-2xl px-4 py-3 text-sm outline-none pr-32 font-mono"
                    />
                    <button
                      type="button"
                      disabled={isSendingOtp || otpCountdown > 0}
                      onClick={handleSendOtp}
                      className="absolute right-2 px-3 py-1.5 bg-[#fa7150] text-white rounded-xl uppercase text-[10px] font-black tracking-wider hover:bg-[#a43e24] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {otpCountdown > 0 ? `${otpCountdown}s` : isSendingOtp ? 'Gửi...' : 'Gửi mã'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-[#e5d8d0] text-sm font-bold text-[#8a7e75] hover:bg-[#faf9f6]"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="flex-1 py-3 rounded-2xl bg-[#fa7150] hover:bg-[#a43e24] text-white text-sm font-bold transition-colors text-center disabled:opacity-50 cursor-pointer"
                  >
                    {passLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </header>
  )
}
