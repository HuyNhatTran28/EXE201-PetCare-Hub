import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types/enums'

interface PrivateRouteProps {
  allowedRoles?: Role[]
}

export const PrivateRoute = ({ allowedRoles }: PrivateRouteProps) => {
  const { user, isAuthenticated } = useAuthStore()
  const location = useLocation()

  // Chưa đăng nhập → về trang login
  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  // Đăng nhập rồi nhưng không đúng role
  if (allowedRoles && user && !allowedRoles.includes(user.role as Role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
