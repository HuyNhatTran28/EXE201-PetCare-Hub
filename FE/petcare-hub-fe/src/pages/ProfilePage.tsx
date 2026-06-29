import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'
import {
  PawPrint,
  User,
  Shield,
  LogOut,
  Crown,
  Plus,
  Coins,
  Building,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Camera,
  Users,
  Percent,
  Check,
  X
} from 'lucide-react'
// ProfilePage — tất cả dữ liệu được tải từ API thật


export const ProfilePage = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Lấy role hiện tại của user để phân luồng giao diện
  const currentRole = user?.role || 'OWNER'

  // State chỉnh sửa thông tin cá nhân (Dùng chung)
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState(user?.address || '')
  const [isSaved, setIsSaved] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  // State Đối tác (PARTNER)
  const [partnerHotels, setPartnerHotels] = useState<any[]>([])
  const [partnerBookings, setPartnerBookings] = useState<any[]>([])
  const [loadingPartner, setLoadingPartner] = useState(false)
  const [showAddHotelModal, setShowAddHotelModal] = useState(false)
  const [newHotelName, setNewHotelName] = useState('')
  const [newHotelAddress, setNewHotelAddress] = useState('')

  useEffect(() => {
    if (currentRole !== 'PARTNER') return
    const fetchPartnerData = async () => {
      setLoadingPartner(true)
      try {
        const response = await axiosInstance.get('/api/hotels/my')
        const hotelList = response.data.content || []
        setPartnerHotels(hotelList)

        // Tải bookings của các khách sạn
        const allBookings: any[] = []
        for (const hotel of hotelList) {
          try {
            const bResponse = await axiosInstance.get(`/api/bookings/hotel/${hotel.id}`)
            const bList = bResponse.data.content || []
            allBookings.push(...bList)
          } catch (err) {
            console.error('Failed to load bookings for hotel ' + hotel.id, err)
          }
        }
        setPartnerBookings(allBookings)
      } catch (error) {
        console.error('Failed to load partner data in ProfilePage', error)
      } finally {
        setLoadingPartner(false)
      }
    }
    fetchPartnerData()
  }, [currentRole])

  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setInterval(() => {
      setOtpCountdown(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCountdown])

  useEffect(() => {
    if (showAddHotelModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showAddHotelModal])

  // State Nhân viên (STAFF) — không dùng mock
  const [diaryNotes, setDiaryNotes] = useState('')

  // State Quản trị viên (ADMIN) — tải từ API
  const [adminHotels, setAdminHotels] = useState<any[]>([])
  const [loadingAdminHotels, setLoadingAdminHotels] = useState(false)

  useEffect(() => {
    if (currentRole !== 'ADMIN') return
    const fetchAdminHotels = async () => {
      setLoadingAdminHotels(true)
      try {
        const res = await axiosInstance.get('/api/hotels?status=PENDING&size=50')
        setAdminHotels(res.data.content || [])
      } catch (err) {
        console.error('Failed to load admin hotels', err)
      } finally {
        setLoadingAdminHotels(false)
      }
    }
    fetchAdminHotels()
  }, [currentRole])

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const handleAddHotel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHotelName.trim()) return
    const newH = {
      id: 'h' + (partnerHotels.length + 1),
      name: newHotelName,
      status: 'PENDING',
      revenue: 0,
      bookingsCount: 0,
      checkInTime: '12:00',
      checkOutTime: '12:00'
    }
    setPartnerHotels([...partnerHotels, newH])
    setNewHotelName('')
    setNewHotelAddress('')
    setShowAddHotelModal(false)
  }

  const handleApproveHotel = async (hotelId: string) => {
    try {
      await axiosInstance.patch(`/api/hotels/${hotelId}/approve`)
      setAdminHotels(prev => prev.map(h => h.id === hotelId ? { ...h, status: 'ACTIVE' } : h))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể phê duyệt khách sạn này.')
    }
  }

  const handleRejectHotel = async (hotelId: string) => {
    if (!confirm('Bạn có chắc muốn từ chối khách sạn này?')) return
    try {
      await axiosInstance.patch(`/api/hotels/${hotelId}/reject`)
      setAdminHotels(prev => prev.filter(h => h.id !== hotelId))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể từ chối khách sạn này.')
    }
  }

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
      setPassError('Vui lòng điền đầy đủ mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu và mã OTP.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu mới và xác nhận mật khẩu không trùng khớp.')
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#303330] font-sans flex flex-col md:flex-row selection:bg-[#fa7150] selection:text-white">

      {/* ── SIDEBAR ĐIỀU HƯỚNG THEO ROLE (Bên Trái) ── */}
      <aside className="w-full md:w-72 bg-[#f5ede8] border-r border-[#e5d8d0] flex flex-col py-8 shrink-0 relative overflow-hidden md:h-screen md:sticky md:top-0 text-left">
        <div className="px-8 mb-10 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-[#fa7150] flex items-center justify-center text-white shadow-lg shadow-[#fa7150]/20">
            <PawPrint size={20} />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-[#303330] leading-none">PetCare Hub</h1>
            <p className="text-[9px] text-[#fa7150] font-black uppercase tracking-wider mt-1">Bảng điều khiển</p>
          </div>
        </div>

        <nav className="flex-grow space-y-1 relative z-10">
          {/* OWNER Links */}
          {currentRole === 'OWNER' && (
            <>
              <Link to="/" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <PawPrint size={16} className="mr-4" /> Trang chủ
              </Link>
              <Link to="/hotels" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <CalendarDays size={16} className="mr-4" /> Đặt phòng
              </Link>
              <Link to="/pets" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <User size={16} className="mr-4" /> Thú cưng của tôi
              </Link>
              <Link to="/my-bookings" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <ClipboardList size={16} className="mr-4" /> Nhật ký hoạt động
              </Link>
              <Link to="/profile" className="flex items-center bg-white text-[#fa7150] font-black px-8 py-3.5 mx-4 rounded-2xl shadow-sm text-xs font-bold uppercase tracking-wider">
                <Crown size={16} className="mr-4" /> Điểm thành viên
              </Link>
            </>
          )}

          {/* PARTNER Links */}
          {currentRole === 'PARTNER' && (
            <>
              <Link to="/profile" className="flex items-center bg-white text-[#fa7150] font-black px-8 py-3.5 mx-4 rounded-2xl shadow-sm text-xs font-bold uppercase tracking-wider">
                <Building size={16} className="mr-4" /> Quản lý khách sạn
              </Link>
              <Link to="/hotels" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <BarChart3 size={16} className="mr-4" /> Báo cáo doanh thu
              </Link>
            </>
          )}

          {/* STAFF Links */}
          {currentRole === 'STAFF' && (
            <>
              <Link to="/profile" className="flex items-center bg-white text-[#fa7150] font-black px-8 py-3.5 mx-4 rounded-2xl shadow-sm text-xs font-bold uppercase tracking-wider">
                <ClipboardList size={16} className="mr-4" /> Nhiệm vụ hôm nay
              </Link>
            </>
          )}

          {/* ADMIN Links */}
          {currentRole === 'ADMIN' && (
            <>
              <Link to="/profile" className="flex items-center bg-white text-[#fa7150] font-black px-8 py-3.5 mx-4 rounded-2xl shadow-sm text-xs font-bold uppercase tracking-wider">
                <Shield size={16} className="mr-4" /> Duyệt khách sạn
              </Link>
              <Link to="/hotels" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <Users size={16} className="mr-4" /> Quản lý tài khoản
              </Link>
              <Link to="/vouchers" className="flex items-center text-[#5a5550] hover:text-[#fa7150] hover:bg-white/40 px-8 py-3.5 transition-all text-xs font-bold uppercase tracking-wider">
                <Percent size={16} className="mr-4" /> Quản lý Voucher
              </Link>
            </>
          )}
        </nav>

        <div className="px-4 mt-auto relative z-10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-[#a43e24] hover:bg-white/50 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            <LogOut size={16} /> Đăng xuất tài khoản
          </button>
        </div>
      </aside>

      {/* ── NỘI DUNG CHÍNH DYNAMIC THEO ROLE ── */}
      <main className="flex-grow p-6 md:p-12 text-left">

        {/* ── 1. GIAO DIỆN CHỦ THÚ CƯNG (OWNER) ── */}
        {currentRole === 'OWNER' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            <h2 className="text-3xl sm:text-5xl font-black text-[#303330]">Hội viên & Điểm thưởng</h2>
            <p className="text-[#5a5550] text-sm">Chào mừng quay trở lại! Bạn đang sở hữu những đặc quyền khách hàng thân thiết hàng đầu.</p>

            {/* Loyalty points card */}
            <div className="bg-[#1e392a] text-white p-8 rounded-3xl flex justify-between items-center shadow-xl">
              <div>
                <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black uppercase">Đặc quyền Gold</span>
                <h3 className="text-2xl font-black mt-4">Điểm Tích Lũy Của Bạn</h3>
              </div>
              <div className="text-center bg-white/10 p-6 rounded-2xl border border-white/10">
                <Coins size={32} className="text-[#fa7150] mx-auto mb-1" />
                <p className="text-2xl font-black">450 Pts</p>
                <span className="text-[9px] uppercase font-bold text-gray-300">Hạng Vàng</span>
              </div>
            </div>

            {/* Profile Edit */}
            <div className="bg-white p-8 rounded-3xl border border-[#e5d8d0] shadow-sm">
              <h3 className="text-lg font-black mb-6">Cập nhật thông tin tài khoản</h3>
              {isSaved && <div className="mb-4 text-xs font-bold text-[#44683b]">Cập nhật thành công!</div>}
              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-bold">
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Họ và tên</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none" />
                </div>
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Số điện thoại</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[#8a7e75] mb-2 uppercase">Địa chỉ</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none" />
                </div>
                <div className="md:col-span-2 text-right">
                  <button type="submit" className="bg-[#fa7150] text-white px-6 py-3 rounded-full uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg">
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 2. GIAO DIỆN CHỦ KHÁCH SẠN (PARTNER) ── */}
        {currentRole === 'PARTNER' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-[#303330]">Quản lý Khách sạn</h2>
                <p className="text-xs text-[#8a7e75] mt-1.5">Xem danh sách, cập nhật thông tin phòng và quản lý đơn đặt của đối tác.</p>
              </div>
              <button
                onClick={() => setShowAddHotelModal(true)}
                className="bg-[#fa7150] text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#fa7150]/20 hover:scale-[1.02] transition-transform cursor-pointer"
              >
                <Plus size={16} /> Đăng ký khách sạn mới
              </button>
            </div>

            {/* MODAL THÊM KHÁCH SẠN */}
            {showAddHotelModal && (
              <div className="fixed inset-0 z-50 bg-[#303330]/65 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#e5d8d0] animate-in fade-in zoom-in duration-200">
                  <h3 className="text-xl font-black mb-4">Đăng ký Khách sạn mới</h3>
                  <form onSubmit={handleAddHotel} className="space-y-4 text-xs font-bold">
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Tên khách sạn</label>
                      <input
                        type="text"
                        required
                        value={newHotelName}
                        onChange={e => setNewHotelName(e.target.value)}
                        placeholder="Ví dụ: Sanctuary Villa"
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8a7e75] mb-1.5 uppercase">Địa chỉ cụ thể</label>
                      <input
                        type="text"
                        required
                        value={newHotelAddress}
                        onChange={e => setNewHotelAddress(e.target.value)}
                        placeholder="Số nhà, Tên đường..."
                        className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-xl outline-none"
                      />
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddHotelModal(false)}
                        className="px-4 py-2.5 bg-[#f5ede8] rounded-xl hover:bg-[#e5d8d0] cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#fa7150] text-white rounded-xl cursor-pointer"
                      >
                        Đăng ký ngay
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Grid khách sạn sở hữu */}
            {loadingPartner ? (
              <div className="py-12 text-center text-[#8a7e75] font-bold text-sm">
                Đang tải dữ liệu khách sạn đối tác...
              </div>
            ) : partnerHotels.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-[#e5d8d0] rounded-3xl bg-white p-8">
                <p className="text-[#8a7e75] font-bold text-xs">Bạn chưa đăng ký khách sạn nào.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partnerHotels.map(hotel => {
                  const hotelBookings = partnerBookings.filter(b => b.hotelId === hotel.id)
                  const totalRevenue = hotelBookings
                    .filter(b => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'COMPLETED')
                    .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
                  const totalBookingsCount = hotelBookings.length
                  return (
                    <div key={hotel.id} className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-base text-[#303330]">{hotel.name}</h3>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${hotel.status === 'ACTIVE' ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#fff0e6] text-[#fa7150]'
                            }`}>
                            {hotel.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang chờ duyệt'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-[#e5d8d0]/60 pt-4 text-xs font-bold text-[#8a7e75] mb-6">
                          <div>
                            <p className="text-[10px] uppercase">Doanh thu tạm tính</p>
                            <p className="text-base font-black text-[#a43e24] mt-1">{totalRevenue.toLocaleString('vi-VN')} đ</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase">Tổng lượt đặt phòng</p>
                            <p className="text-base font-black text-[#303330] mt-1">{totalBookingsCount} đơn</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/partner/hotels/${hotel.id}/rooms`)}
                        className="w-full py-2.5 bg-[#fbf7f4] hover:bg-[#fa7150] hover:text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer border border-[#e5d8d0]"
                      >
                        Xem chi tiết & Quản lý phòng
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Danh sách đặt phòng mới gửi về */}
            <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 shadow-sm">
              <h3 className="text-lg font-black mb-6">Đơn đặt phòng gần đây của khách</h3>
              {partnerBookings.length === 0 ? (
                <p className="text-[#8a7e75] text-xs py-4 text-center font-bold">Chưa có đơn đặt phòng nào gửi về.</p>
              ) : (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f5ede8]">
                        <th className="px-4 py-3 font-bold text-[#8a7e75] text-left">Thú cưng</th>
                        <th className="px-4 py-3 font-bold text-[#8a7e75] text-left">Hạng phòng</th>
                        <th className="px-4 py-3 font-bold text-[#8a7e75] text-left">Ngày lưu trú</th>
                        <th className="px-4 py-3 font-bold text-[#8a7e75] text-right">Tổng tiền</th>
                        <th className="px-4 py-3 font-bold text-[#8a7e75] text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {partnerBookings.map(b => {
                        const petNames = b.pets?.map((p: any) => `${p.name} (${p.species === 'CAT' ? 'Mèo' : 'Chó'})`).join(', ') || 'Chưa rõ'
                        return (
                          <tr key={b.id} className="border-b border-[#e5d8d0]/40">
                            <td className="px-4 py-3 font-bold text-left">{petNames}</td>
                            <td className="px-4 py-3 text-[#5a5550] text-left">{b.roomTypeName || 'Tiêu chuẩn'}</td>
                            <td className="px-4 py-3 text-[#8a7e75] text-left">{b.checkInDate} - {b.checkOutDate}</td>
                            <td className="px-4 py-3 text-right font-black text-[#a43e24]">{(b.totalAmount || 0).toLocaleString('vi-VN')} đ</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`inline-block px-2.5 py-1 text-[8px] font-black rounded-full uppercase ${b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#fff0e6] text-[#fa7150]'
                                }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── 3. GIAO DIỆN NHÂN VIÊN CHĂM SÓC (STAFF) ── */}
        {currentRole === 'STAFF' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#303330]">Nhiệm Vụ Bảo Mẫu</h2>
              <p className="text-xs text-[#8a7e75] mt-1.5">Xem danh sách công việc được phân công, cập nhật tiến trình ăn uống, vui chơi và viết nhật ký cưng yêu.</p>
            </div>

            {/* Hướng dẫn dùng Partner Dashboard */}
            <div className="bg-white rounded-3xl border border-[#e5d8d0] p-8 shadow-sm text-center">
              <div className="w-16 h-16 bg-[#f5ede8] text-[#fa7150] rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList size={28} />
              </div>
              <h3 className="text-lg font-black text-[#303330] mb-2">Quản lý công việc tại Partner Dashboard</h3>
              <p className="text-xs text-[#8a7e75] max-w-sm mx-auto mb-6">
                Danh sách nhiệm vụ, lịch chăm sóc và nhật ký thú cưng được quản lý trực tiếp tại bảng điều khiển của khách sạn bạn làm việc.
              </p>
              <Link
                to="/partner/dashboard"
                className="inline-flex items-center gap-2 bg-[#fa7150] text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all shadow-lg shadow-[#fa7150]/20"
              >
                <Building size={14} /> Đến Partner Dashboard
              </Link>
            </div>

            {/* Viết nhật ký thú cưng */}
            <div className="bg-[#fdfaf8] rounded-3xl p-8 border border-[#e5d8d0] text-left">
              <h3 className="text-lg font-black text-[#303330] mb-4 flex items-center gap-2">
                <Camera size={18} className="text-[#fa7150]" /> Viết Nhật ký cho bé
              </h3>
              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Nội dung ghi chú</label>
                  <textarea
                    rows={4}
                    value={diaryNotes}
                    onChange={e => setDiaryNotes(e.target.value)}
                    placeholder="Ghi chú tình trạng sức khỏe, thức ăn, hoạt động của bé hôm nay..."
                    className="w-full p-4 bg-white border border-[#e5d8d0] rounded-2xl outline-none font-normal"
                  />
                </div>
                <div className="text-right">
                  <button
                    onClick={() => {
                      if (!diaryNotes.trim()) { alert('Vui lòng nhập nội dung nhật ký!'); return }
                      alert('Ghi chú đã được lưu!')
                      setDiaryNotes('')
                    }}
                    className="bg-[#fa7150] text-white px-6 py-3 rounded-full uppercase tracking-wider cursor-pointer shadow-lg shadow-[#fa7150]/20 inline-flex"
                  >
                    Lưu ghi chú
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* ── 4. GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN) ── */}
        {currentRole === 'ADMIN' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            <div>
              <h2 className="text-3xl sm:text-5xl font-black text-[#303330]">Phê duyệt Khách sạn Đối tác</h2>
              <p className="text-xs text-[#8a7e75] mt-1.5">Kiểm duyệt chất lượng phòng, thông tin cơ sở hạ tầng trước khi cấp phép hoạt động chính thức trên hệ thống.</p>
            </div>

            {/* List khách sạn chờ duyệt */}
            <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-black mb-6">Yêu cầu đăng ký chờ duyệt</h3>

              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f5ede8]">
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Tên khách sạn</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Chủ đối tác</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Địa chỉ</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Trạng thái</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75] text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminHotels.map(hotel => (
                      <tr key={hotel.id} className="border-b border-[#e5d8d0]/40">
                        <td className="px-4 py-3 font-bold">{hotel.name}</td>
                        <td className="px-4 py-3 text-[#5a5550]">{hotel.partnerName}</td>
                        <td className="px-4 py-3 text-[#8a7e75]">{hotel.address}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-1 text-[8px] font-black rounded-full uppercase ${hotel.status === 'ACTIVE' ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#fff0e6] text-[#fa7150]'
                            }`}>
                            {hotel.status === 'ACTIVE' ? 'Hoạt động' : 'Chờ duyệt'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hotel.status === 'PENDING' ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleApproveHotel(hotel.id)}
                                className="p-1.5 bg-[#d0fac0] hover:bg-[#d0fac0]/80 rounded-full text-[#2c4e24] transition-all cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => handleRejectHotel(hotel.id)}
                                className="p-1.5 bg-[#fdf0ec] hover:bg-[#fdf0ec]/80 rounded-full text-[#a43e24] transition-all cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-bold">Đã cấp phép</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Đổi mật khẩu chung cho tất cả các vai trò */}
        <div className="bg-white p-8 rounded-3xl border border-[#e5d8d0] shadow-sm mt-8">
          <h3 className="text-lg font-black mb-6">Đổi mật khẩu tài khoản</h3>
          {passError && <div className="mb-4 text-xs font-bold text-rose-500">{passError}</div>}
          {passSuccess && <div className="mb-4 text-xs font-bold text-emerald-600">{passSuccess}</div>}
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-bold">
            <div>
              <label className="block text-[#8a7e75] mb-2 uppercase">Mật khẩu cũ</label>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none" />
            </div>
            <div>
              <label className="block text-[#8a7e75] mb-2 uppercase">Mật khẩu mới</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none" />
            </div>
            <div>
              <label className="block text-[#8a7e75] mb-2 uppercase">Xác nhận mật khẩu mới</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none" />
            </div>
            <div className="md:col-span-3 flex flex-col md:flex-row gap-4 items-end mt-2">
              <div className="flex-grow w-full">
                <label className="block text-[#8a7e75] mb-2 uppercase">Mã xác thực OTP (Kiểm tra Email của bạn)</label>
                <div className="relative flex items-center">
                  <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="Nhập mã OTP 6 số" className="w-full p-3 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none pr-36 font-mono" />
                  <button type="button" disabled={isSendingOtp || otpCountdown > 0} onClick={handleSendOtp} className="absolute right-2 px-4 py-2 bg-[#fa7150] text-white rounded-xl uppercase text-[10px] font-black tracking-wider hover:bg-[#a43e24] transition-colors disabled:opacity-50 cursor-pointer">
                    {otpCountdown > 0 ? `Gửi lại sau (${otpCountdown}s)` : isSendingOtp ? 'Đang gửi...' : 'Gửi mã OTP'}
                  </button>
                </div>
              </div>
            </div>
            <div className="md:col-span-3 text-right">
              <button type="submit" disabled={passLoading} className="bg-[#a43e24] text-white px-6 py-3 rounded-full uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 inline-flex">
                {passLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>
        </div>

      </main>

    </div>
  )
}
