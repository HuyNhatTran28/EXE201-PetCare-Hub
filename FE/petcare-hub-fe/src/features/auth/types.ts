// Khớp 1-1 với các Request/Response class bên BE Java

export interface LoginRequest {
    email: string
    password: string
}

export interface RegisterRequest {
    email: string
    password: string
    fullName: string
    phone?: string
    role: 'OWNER' | 'PARTNER'
}

export interface AuthResponse {
    accessToken: string
    refreshToken: string
    tokenType: string
    expiresIn: number
    user: {
        id: string
        email: string
        fullName: string
        phone: string | null
        avatarUrl: string | null
        role: 'OWNER' | 'PARTNER' | 'STAFF' | 'ADMIN'
        mustChangePassword?: boolean
    }
}

export interface UserResponse {
    id: string
    email: string
    fullName: string
    phone: string | null
    address: string | null
    avatarUrl: string | null
    role: 'OWNER' | 'PARTNER' | 'STAFF' | 'ADMIN'
    notificationOptedIn: boolean
    isActive: boolean
    createdAt: string
}