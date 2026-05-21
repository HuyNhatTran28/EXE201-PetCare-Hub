import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Request interceptor — tự động đính kèm JWT vào mỗi request
axiosInstance.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — tự động refresh token khi nhận 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // Access token hết hạn → thử refresh
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = useAuthStore.getState().refreshToken
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/refresh`,
          { refreshToken }
        )
        const { accessToken } = res.data
        useAuthStore.getState().setAccessToken(accessToken)
        original.headers.Authorization = `Bearer ${accessToken}`
        return axiosInstance(original)
      } catch {
        // Refresh thất bại → logout
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
