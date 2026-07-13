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
import { PetDiaryPage } from '@/pages/PetDiaryPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PaymentResultPage } from '@/pages/PaymentResultPage'
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage'
import { ChatPage } from '@/pages/ChatPage'
import { ForceChangePasswordPage } from '@/pages/ForceChangePasswordPage'

// Partner Pages
import { PartnerLayout } from '@/pages/partner/PartnerLayout'
import { PartnerDashboard } from '@/pages/partner/PartnerDashboard'
import { RoomManagePage } from '@/pages/partner/RoomManagePage'
import { ServiceManagePage } from '@/pages/partner/ServiceManagePage'
import { BookingManagePage } from '@/pages/partner/BookingManagePage'
import { HotelCreatePage } from '@/pages/partner/HotelCreatePage'
import { StaffManagePage } from '@/pages/partner/StaffManagePage'
import { StaffChatPage } from '@/pages/partner/StaffChatPage'
import { StaffDiaryPage } from '@/pages/partner/StaffDiaryPage'

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
import { FeedbackManagePage } from '@/pages/admin/FeedbackManagePage'
import { ReportManagePage } from '@/pages/admin/ReportManagePage'

export const router = createBrowserRouter([

  // Public
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/oauth-callback', element: <OAuthCallbackPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/hotels', element: <HotelListPage /> },
  { path: '/hotels/:id', element: <HotelDetailPage /> },
  { path: '/route-search', element: <RouteSearchPage /> },
  { path: '/map', element: <RouteSearchPage /> },
  { path: '/chat', element: <ChatPage /> },

  // Cần đăng nhập (mọi role)
  {
    element: <PrivateRoute />,
    children: [
      { path: '/profile', element: <ProfilePage /> },
      { path: '/my-bookings', element: <MyBookingsPage /> },
      { path: '/payment-result', element: <PaymentResultPage /> },
      { path: '/force-change-password', element: <ForceChangePasswordPage /> },
    ],
  },

  // OWNER only
  {
    element: <PrivateRoute allowedRoles={[Role.OWNER]} />,
    children: [
      { path: '/pets', element: <PetProfilePage /> },
      { path: '/pet-diaries', element: <PetDiaryPage /> },
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
          { path: '/partner/staff', element: <StaffManagePage /> },
        ]
      }
    ],
  },

  // PARTNER + STAFF shared (chat page)
  {
    element: <PrivateRoute allowedRoles={[Role.PARTNER, Role.STAFF]} />,
    children: [
      {
        element: <PartnerLayout />,
        children: [
          { path: '/partner/messages', element: <StaffChatPage /> },
          { path: '/partner/diaries', element: <StaffDiaryPage /> },
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
          { path: '/admin/feedbacks', element: <FeedbackManagePage /> },
          { path: '/admin/reports', element: <ReportManagePage /> },
        ]
      }
    ]
  },

  { path: '*', element: <NotFoundPage /> },
])