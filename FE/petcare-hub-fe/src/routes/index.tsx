import { createBrowserRouter } from 'react-router-dom'
import { PrivateRoute } from './PrivateRoute'
import { Role } from '@/types/enums'

import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { HomePage } from '@/pages/HomePage'
import { HotelListPage } from '@/pages/HotelListPage'
import { HotelDetailPage } from '@/pages/HotelDetailPage'
import { RouteSearchPage } from '@/pages/RouteSearchPage'
import { BookingPage } from '@/pages/BookingPage'
import { MyBookingsPage } from '@/pages/MyBookingsPage'
import { PetProfilePage } from '@/pages/PetProfilePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PaymentResultPage } from '@/pages/PaymentResultPage'

// Partner Pages
import { PartnerLayout } from '@/pages/partner/PartnerLayout'
import { PartnerDashboard } from '@/pages/partner/PartnerDashboard'
import { RoomManagePage } from '@/pages/partner/RoomManagePage'
import { ServiceManagePage } from '@/pages/partner/ServiceManagePage'
import { BookingManagePage } from '@/pages/partner/BookingManagePage'
import { HotelCreatePage } from '@/pages/partner/HotelCreatePage'

// Admin Pages
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { HotelApprovePage } from '@/pages/admin/HotelApprovePage'
import { UserManagePage } from '@/pages/admin/UserManagePage'
import { MarketingPage } from '@/pages/admin/MarketingPage'
import { AnalyticsPage } from '@/pages/admin/AnalyticsPage'
import { AuditLogPage } from '@/pages/admin/AuditLogPage'
import { SettingsPage } from '@/pages/admin/SettingsPage'
import { WithdrawalApprovePage } from '@/pages/admin/WithdrawalApprovePage'

export const router = createBrowserRouter([

  // Public
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/hotels', element: <HotelListPage /> },
  { path: '/hotels/:id', element: <HotelDetailPage /> },
  { path: '/route-search', element: <RouteSearchPage /> },
  { path: '/map', element: <RouteSearchPage /> },

  // Cần đăng nhập
  {
    element: <PrivateRoute />,
    children: [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/my-bookings', element: <MyBookingsPage /> },
      { path: '/payment-result', element: <PaymentResultPage /> },
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
      {
        element: <PartnerLayout />,
        children: [
          { path: '/partner/dashboard', element: <PartnerDashboard /> },
          { path: '/partner/hotels/:hotelId/rooms', element: <RoomManagePage /> },
          { path: '/partner/hotels/:hotelId/services', element: <ServiceManagePage /> },
          { path: '/partner/bookings', element: <BookingManagePage /> },
          { path: '/partner/hotels/new', element: <HotelCreatePage /> },
        ]
      }
    ],
  },

  // ADMIN only
  {
    element: <PrivateRoute allowedRoles={[Role.ADMIN]} />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard', element: <AdminDashboard /> },
          { path: '/admin/hotels', element: <HotelApprovePage /> },
          { path: '/admin/users', element: <UserManagePage /> },
          { path: '/admin/marketing', element: <MarketingPage /> },
          { path: '/admin/analytics', element: <AnalyticsPage /> },
          { path: '/admin/audit', element: <AuditLogPage /> },
          { path: '/admin/settings', element: <SettingsPage /> },
          { path: '/admin/withdrawals', element: <WithdrawalApprovePage /> },
        ]
      }
    ]
  },

  { path: '*', element: <NotFoundPage /> },
])