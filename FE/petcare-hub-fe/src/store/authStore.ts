import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'OWNER' | 'PARTNER' | 'STAFF' | 'ADMIN'

interface UserInfo {
  id: string
  email: string
  fullName: string
  phone: string | null
  avatarUrl: string | null
  role: Role
  mustChangePassword?: boolean
  address?: string | null
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserInfo | null

  // Actions
  setAuth: (accessToken: string, refreshToken: string, user: UserInfo) => void
  setAccessToken: (token: string) => void
  updateUser: (userInfo: Partial<UserInfo>) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setAuth: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user }),

      setAccessToken: (accessToken) =>
        set({ accessToken }),

      updateUser: (userInfo) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userInfo } : null
        })),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'petcare-auth', // key trong localStorage
      // Chỉ persist token và user — không persist function
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)
