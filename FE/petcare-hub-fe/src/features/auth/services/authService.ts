import axiosInstance from '@/lib/axios'
import type { LoginRequest, RegisterRequest, AuthResponse, UserResponse } from '../types'

export const authService = {

    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const res = await axiosInstance.post('/api/auth/login', data)
        return res.data
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const res = await axiosInstance.post('/api/auth/register', data)
        return res.data
    },

    getMe: async (): Promise<UserResponse> => {
        const res = await axiosInstance.get('/api/auth/me')
        return res.data
    },
}