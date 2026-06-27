import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { getHomeByRole } from '@/utils/navigateByRole'
import axiosInstance from '@/lib/axios'

export const OAuthCallbackPage = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [error, setError] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const refreshToken = params.get('refreshToken')

    if (!token || !refreshToken) {
      setError(true)
      return
    }

    // Lấy thông tin user bằng token vừa nhận — không qua store interceptor
    axiosInstance
      .get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const u = res.data
        setAuth(token, refreshToken, {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phone: u.phone ?? null,
          avatarUrl: u.avatarUrl ?? null,
          role: u.role,
        })

        navigate(getHomeByRole(u.role), { replace: true })
      })
      .catch(() => setError(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#fdfaf8]">
        <p className="text-[#a43e24] font-semibold">Đăng nhập Google thất bại.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-5 py-2.5 bg-[#fa7150] text-white rounded-xl text-sm font-bold"
        >
          Quay lại đăng nhập
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfaf8]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#fa7150] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#8a7e75] font-medium">Đang xử lý đăng nhập...</p>
      </div>
    </div>
  )
}
