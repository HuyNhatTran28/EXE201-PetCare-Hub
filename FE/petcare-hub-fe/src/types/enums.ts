// Map 1-1 với enum trong BE Java

export const Role = {
  OWNER: 'OWNER',
  PARTNER: 'PARTNER',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export const PaymentGateway = {
  VNPAY: 'VNPAY',
  MOMO: 'MOMO',
  VIETQR: 'VIETQR',
  CASH: 'CASH',
} as const;
export type PaymentGateway = typeof PaymentGateway[keyof typeof PaymentGateway];
