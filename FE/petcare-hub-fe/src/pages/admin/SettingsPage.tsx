import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import axiosInstance from '@/lib/axios'
import { Shield, Key, Mail, User, Info, CheckCircle } from 'lucide-react'

export const SettingsPage = () => {
  const { user } = useAuthStore()

  // Change Password States
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [passLoading, setPassLoading] = useState(false)

  // Countdown effect
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
      setPassSuccess('Mã xác thực OTP đã được gửi về Email đăng ký của bạn.')
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
      setPassError('Mật khẩu mới và xác nhận mật khẩu không khớp.')
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

  return (
    <div className="p-6 md:p-12 space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className="text-3xl sm:text-5xl font-black text-[#303330]">Cài đặt tài khoản</h2>
        <p className="text-xs text-[#8a7e75] mt-1.5">
          Quản lý thông tin bảo mật và cấu hình cài đặt của tài khoản Quản trị viên.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Account Info Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e5d8d0] shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#fa7150]/5 rounded-full blur-2xl -mr-8 -mt-8" />
            
            <h3 className="text-base font-black text-[#303330] mb-6 flex items-center gap-2">
              <Info size={18} className="text-[#fa7150]" /> Thông tin cá nhân
            </h3>

            <div className="flex flex-col items-center py-4 border-b border-[#e5d8d0]/60 mb-6">
              <div className="w-20 h-20 rounded-full bg-[#fa7150]/10 flex items-center justify-center text-2xl font-black text-[#fa7150] border-2 border-[#fa7150]/20 shadow-inner">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <h4 className="mt-3 font-black text-[#303330] text-lg">{user?.fullName || 'Quản trị viên'}</h4>
              <span className="text-[10px] uppercase font-black tracking-widest text-[#fa7150] bg-[#fa7150]/10 px-3 py-1 rounded-full mt-1.5">
                {user?.role || 'ADMIN'}
              </span>
            </div>

            <div className="space-y-4 text-xs font-bold">
              <div className="flex justify-between items-center py-2 border-b border-[#e5d8d0]/40">
                <span className="text-[#8a7e75] flex items-center gap-1.5"><Mail size={14} /> Email</span>
                <span className="text-[#303330] font-mono">{user?.email || 'admin@petcarehub.com'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#e5d8d0]/40">
                <span className="text-[#8a7e75] flex items-center gap-1.5"><User size={14} /> Tên đầy đủ</span>
                <span className="text-[#303330]">{user?.fullName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#8a7e75] flex items-center gap-1.5"><Shield size={14} /> Trạng thái</span>
                <span className="text-[#2c4e24] bg-[#d0fac0] px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle size={10} /> Đang hoạt động
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Form Card */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-[#e5d8d0] shadow-sm">
            <h3 className="text-base font-black text-[#303330] mb-6 flex items-center gap-2">
              <Key size={18} className="text-[#fa7150]" /> Thay đổi mật khẩu bảo mật
            </h3>

            {passError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold flex items-center">
                {passError}
              </div>
            )}
            
            {passSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs font-bold flex items-center">
                {passSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6 text-xs font-bold">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={e => setOldPassword(e.target.value)}
                    className="w-full p-3.5 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none focus:border-[#fa7150] transition-colors"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>
                <div className="hidden md:block" />
                
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-3.5 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none focus:border-[#fa7150] transition-colors"
                    placeholder="Nhập mật khẩu mới"
                  />
                </div>
                <div>
                  <label className="block text-[#8a7e75] mb-2 uppercase">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full p-3.5 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none focus:border-[#fa7150] transition-colors"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>
              </div>

              <div className="border-t border-[#e5d8d0]/60 pt-6">
                <label className="block text-[#8a7e75] mb-2 uppercase">Mã xác thực OTP (Được gửi về Email)</label>
                <div className="relative flex items-center max-w-md">
                  <input
                    type="text"
                    required
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Nhập mã OTP 6 số"
                    className="w-full p-3.5 bg-[#fdfaf8] border border-[#e5d8d0] rounded-2xl outline-none pr-36 font-mono focus:border-[#fa7150] transition-colors"
                  />
                  <button
                    type="button"
                    disabled={isSendingOtp || otpCountdown > 0}
                    onClick={handleSendOtp}
                    className="absolute right-2 px-4 py-2 bg-[#fa7150] text-white rounded-xl uppercase text-[10px] font-black tracking-wider hover:bg-[#a43e24] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {otpCountdown > 0 ? `Gửi lại sau (${otpCountdown}s)` : isSendingOtp ? 'Đang gửi...' : 'Gửi mã OTP'}
                  </button>
                </div>
                <p className="text-[10px] text-[#8a7e75] font-semibold mt-2">
                  Để đảm bảo an toàn, hệ thống sẽ gửi một mã OTP 6 chữ số tới hòm thư của bạn.
                </p>
              </div>

              <div className="text-right pt-4">
                <button
                  type="submit"
                  disabled={passLoading}
                  className="bg-[#a43e24] text-white px-8 py-3.5 rounded-full uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-50 inline-flex"
                >
                  {passLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
