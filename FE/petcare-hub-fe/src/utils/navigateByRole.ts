import type { Role } from '@/store/authStore'

export function getHomeByRole(role: Role | string): string {
  switch (role) {
    case 'ADMIN':   return '/admin/dashboard'
    case 'PARTNER': return '/partner/dashboard'
    case 'STAFF':   return '/partner/messages'
    default:        return '/hotels'          // OWNER
  }
}
