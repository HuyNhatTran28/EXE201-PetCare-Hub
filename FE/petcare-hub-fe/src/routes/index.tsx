import { createBrowserRouter } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { Role } from '@/types/enums'

import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { HomePage } from '@/pages/HomePage'
import { HotelListPage } from '@/pages/HotelListPage'
import { HotelDetailPage } from '@/pages/HotelDetailPage'
import { BookingPage } from '@/pages/BookingPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { PetProfilePage } from '@/pages/PetProfilePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

// Partner Pages
import { PartnerDashboard } from '@/pages/partner/PartnerDashboard'
import { RoomManagePage } from '@/pages/partner/RoomManagePage'
import { ServiceManagePage } from '@/pages/partner/ServiceManagePage'
import { BookingManagePage } from '@/pages/partner/BookingManagePage'
import { HotelCreatePage } from '@/pages/partner/HotelCreatePage'

export const router = createBrowserRouter([

  // Public
  { path: '/', element: <HomePage /> },
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

  // PARTNER only
  {
    element: <PrivateRoute allowedRoles={[Role.PARTNER]} />,
    children: [
      { path: '/partner/dashboard', element: <PartnerDashboard /> },
      { path: '/partner/hotels/:hotelId/rooms', element: <RoomManagePage /> },
      { path: '/partner/hotels/:hotelId/services', element: <ServiceManagePage /> },
      { path: '/partner/bookings', element: <BookingManagePage /> },
      { path: '/partner/hotels/new', element: <HotelCreatePage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
])