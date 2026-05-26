import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import {
  PawPrint,
  User,
  Shield,
  CreditCard,
  Settings,
  LogOut,
  Gem,
  Award,
  Crown,
  Search,
  Plus,
  MoreVertical,
  Coins,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Save,
  Building,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Camera,
  CheckSquare,
  Users,
  Percent,
  Check,
  X,
  Lock
} from 'lucide-react'

// Mock Data cho từng vai trò

// ── 1. ĐỐI TÁC (PARTNER) ──
const MOCK_PARTNER_HOTELS = [
  { id: 'h1', name: 'The Whisker Lodge (Quận 1)', status: 'ACTIVE', revenue: 45000000, bookingsCount: 38, checkInTime: '12:00', checkOutTime: '12:00' },
  { id: 'h2', name: 'Whisker Retreat (Thảo Điền)', status: 'PENDING', revenue: 0, bookingsCount: 0, checkInTime: '14:00', checkOutTime: '12:00' }
]

const MOCK_PARTNER_BOOKINGS = [
  { id: 'b1', petName: 'LuLu (Corgi)', roomType: 'Suite Sân Vườn', checkIn: '24/10/2024', checkOut: '30/10/2024', total: 4500000, status: 'CONFIRMED' },
  { id: 'b2', petName: 'Mimi (Mèo Xiêm)', roomType: 'Deluxe Sunlit', checkIn: '26/10/2024', checkOut: '28/10/2024', total: 900000, status: 'CHECKED_IN' }
]

// ── 2. NHÂN VIÊN (STAFF) ──
const MOCK_STAFF_TASKS = [
  { id: 't1', petName: 'LuLu', room: 'Phòng 101', taskName: 'Cho ăn sáng (Pate cá hồi)', status: 'COMPLETED' },
  { id: 't2', petName: 'LuLu', room: 'Phòng 101', taskName: 'Dắt đi dạo thảm cỏ & nhặt bóng', status: 'PENDING' },
  { id: 't3', petName: 'Mimi', room: 'Phòng 204', taskName: 'Cải thiện chải lông & kiểm tra da', status: 'PENDING' },
  { id: 't4', petName: 'Mimi', room: 'Phòng 204', taskName: 'Cho ăn trưa (Súp thưởng)', status: 'COMPLETED' }
]

// ── 3. QUẢN TRỊ VIÊN (ADMIN) ──
const MOCK_ADMIN_HOTELS = [
  { id: 'ah1', name: 'Paws Hotel & Spa', partnerName: 'Trần Văn A', address: 'Quận 7, HCM', status: 'PENDING' },
  { id: 'ah2', name: 'Happy Tails Villa', partnerName: 'Lê Thị B', address: 'Tây Hồ, Hà Nội', status: 'PENDING' },
  { id: 'ah3', name: 'Meow Mansion', partnerName: 'Phạm Minh C', address: 'Quận 3, HCM', status: 'ACTIVE' }
]

export const ProfilePage = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Lấy role hiện tại của user để phân luồng giao diện
  const currentRole = user?.role || 'OWNER'

  // State chỉnh sửa thông tin cá nhân (Dùng chung)
  const [fullName, setFullName] = useState(user?.fullName || 'Người dùng PetCare')
  const [phone, setPhone] = useState(user?.phone || '0901234567')
  const [address, setAddress] = useState('123 Đường Song Hành, Thảo Điền, Quận 2, TP. HCM')
  const [isSaved, setIsSaved] = useState(false)

  // State Đối tác (PARTNER)
  const [partnerHotels, setPartnerHotels] = useState(MOCK_PARTNER_HOTELS)
  const [partnerBookings, setPartnerBookings] = useState(MOCK_PARTNER_BOOKINGS)
  const [showAddHotelModal, setShowAddHotelModal] = useState(false)
  const [newHotelName, setNewHotelName] = useState('')
  const [newHotelAddress, setNewHotelAddress] = useState('')

  // State Nhân viên (STAFF)
  const [staffTasks, setStaffTasks] = useState(MOCK_STAFF_TASKS)
  const [diaryNotes, setDiaryNotes] = useState('')

  // State Quản trị viên (ADMIN)
  const [adminHotels, setAdminHotels] = useState(MOCK_ADMIN_HOTELS)

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

  const handleToggleTask = (taskId: string) => {
    setStaffTasks(staffTasks.map(t => t.id === taskId ? { ...t, status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' } : t))
  }

  const handleApproveHotel = (hotelId: string) => {
    setAdminHotels(adminHotels.map(h => h.id === hotelId ? { ...h, status: 'ACTIVE' } : h))
  }

  const handleRejectHotel = (hotelId: string) => {
    setAdminHotels(adminHotels.filter(h => h.id !== hotelId))
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
            <h1 className="font-black text-sm tracking-tight text-[#303330] leading-none">Pet Sanctuary</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partnerHotels.map(hotel => (
                <div key={hotel.id} className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-base text-[#303330]">{hotel.name}</h3>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        hotel.status === 'ACTIVE' ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#fff0e6] text-[#fa7150]'
                      }`}>
                        {hotel.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đang chờ duyệt'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-[#e5d8d0]/60 pt-4 text-xs font-bold text-[#8a7e75] mb-6">
                      <div>
                        <p className="text-[10px] uppercase">Doanh thu tạm tính</p>
                        <p className="text-base font-black text-[#a43e24] mt-1">{hotel.revenue.toLocaleString('vi-VN')} đ</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase">Tổng lượt đặt phòng</p>
                        <p className="text-base font-black text-[#303330] mt-1">{hotel.bookingsCount} đơn</p>
                      </div>
                    </div>
                  </div>
                  <button className="w-full py-2.5 bg-[#fbf7f4] hover:bg-[#fa7150] hover:text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer border border-[#e5d8d0]">
                    Xem chi tiết & Quản lý phòng
                  </button>
                </div>
              ))}
            </div>

            {/* Danh sách đặt phòng mới gửi về */}
            <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 shadow-sm">
              <h3 className="text-lg font-black mb-6">Đơn đặt phòng gần đây của khách</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#f5ede8]">
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Thú cưng</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Hạng phòng</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75]">Ngày lưu trú</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75] text-right">Tổng tiền</th>
                      <th className="px-4 py-3 font-bold text-[#8a7e75] text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partnerBookings.map(b => (
                      <tr key={b.id} className="border-b border-[#e5d8d0]/40">
                        <td className="px-4 py-3 font-bold">{b.petName}</td>
                        <td className="px-4 py-3 text-[#5a5550]">{b.roomType}</td>
                        <td className="px-4 py-3 text-[#8a7e75]">{b.checkIn} - {b.checkOut}</td>
                        <td className="px-4 py-3 text-right font-black text-[#a43e24]">{b.total.toLocaleString('vi-VN')} đ</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-block px-2.5 py-1 text-[8px] font-black rounded-full uppercase ${
                            b.status === 'CONFIRMED' ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#fff0e6] text-[#fa7150]'
                          }`}>
                            {b.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã check-in'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

            {/* Danh sách task cần làm */}
            <div className="bg-white rounded-3xl border border-[#e5d8d0] p-6 shadow-sm">
              <h3 className="text-lg font-black mb-6">Bảng công việc hôm nay</h3>
              <div className="space-y-4">
                {staffTasks.map(task => {
                  const isCompleted = task.status === 'COMPLETED'
                  return (
                    <div 
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCompleted ? 'bg-[#d0fac0]/10 border-[#44683b]/30' : 'bg-[#fdfaf8] border-[#e5d8d0] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isCompleted}
                          onChange={() => {}}
                          className="w-4.5 h-4.5 rounded text-[#fa7150] border-[#e5d8d0]"
                        />
                        <div className="text-left">
                          <p className={`font-bold text-xs ${isCompleted ? 'text-gray-400 line-through' : 'text-[#303330]'}`}>{task.taskName}</p>
                          <p className="text-[10px] text-[#8a7e75] mt-0.5">Bé: <strong>{task.petName}</strong> • {task.room}</p>
                        </div>
                      </div>
                      <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase ${
                        isCompleted ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#f5ede8] text-[#8a7e75]'
                      }`}>
                        {isCompleted ? 'Đã hoàn thành' : 'Chưa làm'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Viết nhật ký thú cưng */}
            <div className="bg-[#fdfaf8] rounded-3xl p-8 border border-[#e5d8d0] text-left">
              <h3 className="text-lg font-black text-[#303330] mb-4 flex items-center gap-2">
                <Camera size={18} className="text-[#fa7150]" /> Viết Nhật ký cho bé
              </h3>
              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Chọn bé cưng để viết nhật ký</label>
                  <select className="p-3 bg-white border border-[#e5d8d0] rounded-xl outline-none font-bold cursor-pointer w-full max-w-xs">
                    <option>LuLu (Phòng 101)</option>
                    <option>Mimi (Phòng 204)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Nội dung dòng thời gian (Timeline)</label>
                  <textarea 
                    rows={4}
                    value={diaryNotes}
                    onChange={e => setDiaryNotes(e.target.value)}
                    placeholder="Ví dụ: Bé đã ăn hết pate cá hồi trưa nay, vui đùa và chạy nhảy nhặt bóng 15 phút..."
                    className="w-full p-4 bg-white border border-[#e5d8d0] rounded-2xl outline-none font-normal"
                  />
                </div>
                <div className="text-right">
                  <button 
                    onClick={() => {
                      alert('Đăng nhật ký lên dòng thời gian của chủ bé thành công!')
                      setDiaryNotes('')
                    }}
                    className="bg-[#fa7150] text-white px-6 py-3 rounded-full uppercase tracking-wider cursor-pointer shadow-lg shadow-[#fa7150]/20 inline-flex"
                  >
                    Đăng lên Dòng thời gian
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
                          <span className={`inline-block px-2.5 py-1 text-[8px] font-black rounded-full uppercase ${
                            hotel.status === 'ACTIVE' ? 'bg-[#d0fac0] text-[#2c4e24]' : 'bg-[#fff0e6] text-[#fa7150]'
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

      </main>

    </div>
  )
}
