import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import { useAuthStore } from '@/store/authStore'
import type { RegisterRequest } from '../types'

export const useRegister = () => {
    const setAuth = useAuthStore((s) => s.setAuth)
    const navigate = useNavigate()

    return useMutation({
        mutationFn: (data: RegisterRequest) => authService.register(data),
        onSuccess: (data) => {
            setAuth(data.accessToken, data.refreshToken, data.user)
            navigate('/')
        },
    })
}