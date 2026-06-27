import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PawPrint, Eye, EyeOff, Lock } from 'lucide-react'
import axiosInstance from '@/lib/axios'
import { useAuthStore } from '@/store/authStore'
import { getHomeByRole } from '@/utils/navigateByRole'

export const ForceChangePasswordPage = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    try {
      await axiosInstance.post('/api/auth/force-change-password', {
        oldPassword,
        newPassword,
      })

      // Cập nhật lại user state — xóa flag mustChangePassword
      useAuthStore.setState((s) => ({
        user: s.user ? { ...s.user, mustChangePassword: false } : null,
      }))

      navigate(getHomeByRole(user?.role ?? ''))
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const orangeGradient = { background: 'linear-gradient(135deg, #fa7150 0%, #a43e24 100%)' }

  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={orangeGradient}>
            <PawPrint size={24} />
          </div>
          <span className="text-2xl font-black">PetCare Hub</span>
        </div>

        <div className="bg-white rounded-3xl border border-[#e5d8d0] p-8 shadow-sm">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={orangeGradient}>
              <Lock size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-black text-[#303330]">Đổi mật khẩu lần đầu</h1>
            <p className="text-sm text-[#8a7e75] mt-2">
              Tài khoản của bạn yêu cầu đổi mật khẩu trước khi tiếp tục.
            </p>
            {user?.email && (
              <p className="text-xs font-semibold text-[#fa7150] mt-1">{user.email}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 text-sm mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Old password */}
            <div>
              <label className="block text-xs font-bold text-[#5a5550] mb-1.5">
                Mật khẩu tạm thời
              </label>
              <div className="relative">
                <input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu tạm thời"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-[#e5d8d0] bg-[#faf9f6] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa7150]/30 focus:border-[#fa7150]"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7e75] hover:text-[#303330]"
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-xs font-bold text-[#5a5550] mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-[#e5d8d0] bg-[#faf9f6] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa7150]/30 focus:border-[#fa7150]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a7e75] hover:text-[#303330]"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-xs font-bold text-[#5a5550] mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                required
                className="w-full px-4 py-3 rounded-2xl border border-[#e5d8d0] bg-[#faf9f6] text-sm focus:outline-none focus:ring-2 focus:ring-[#fa7150]/30 focus:border-[#fa7150]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm mt-2 disabled:opacity-60 transition-opacity"
              style={orangeGradient}
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </form>

          <button
            onClick={() => { logout(); navigate('/login') }}
            className="w-full text-center text-xs text-[#8a7e75] hover:text-red-500 mt-4 transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  )
}
