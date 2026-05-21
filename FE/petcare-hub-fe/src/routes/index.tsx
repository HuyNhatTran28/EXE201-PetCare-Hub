import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { Role } from '@/types/enums'

import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HotelListPage } from '@/pages/HotelListPage'
import { HotelDetailPage } from '@/pages/HotelDetailPage'
import { BookingPage } from '@/pages/BookingPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { PetProfilePage } from '@/pages/PetProfilePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([

  // Mặc định vào / → redirect về /login
  { path: '/', element: <Navigate to="/login" replace /> },

  // Public
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/hotels', element: <HotelListPage /> },
  { path: '/hotels/:id', element: <HotelDetailPage /> },

  // Cần đăng nhập
  {
    element: <PrivateRoute />,
    children: [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/my-bookings', element: <MyBookingsPage /> },
    ],
  },

  // OWNER only
  {
    element: <PrivateRoute allowedRoles={[Role.OWNER]} />,
    children: [
      { path: '/pets', element: <PetProfilePage /> },
      { path: '/booking/:roomTypeId', element: <BookingPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])