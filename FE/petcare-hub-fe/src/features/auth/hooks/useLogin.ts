import { useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../services/authService'
import { useAuthStore } from '@/store/authStore'
import type { LoginRequest } from '../types'

export const useLogin = () => {
    const setAuth = useAuthStore((s) => s.setAuth)
    const navigate = useNavigate()
    const location = useLocation()

    return useMutation({
        mutationFn: (data: LoginRequest) => authService.login(data),
        onSuccess: (data) => {
            setAuth(data.accessToken, data.refreshToken, data.user)

            if (data.user?.mustChangePassword) {
                navigate('/force-change-password')
                return
            }

            const from = (location.state as any)?.from
            if (from) {
                navigate(from, { replace: true })
                return
            }

            // Redirect theo role
            switch(data.user?.role) {
                case 'PARTNER':
                    navigate('/partner/dashboard')
                    break
                case 'ADMIN':
                    navigate('/admin/dashboard')
                    break
                case 'STAFF':
                    navigate('/staff/dashboard')
                    break
                default:
                    navigate('/hotels') // OWNER
            }
        },
    })
}