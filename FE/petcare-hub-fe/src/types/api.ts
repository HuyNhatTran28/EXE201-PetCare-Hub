// Response wrapper chung từ BE

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface ErrorResponse {
  status: number
  message: string
  timestamp: string
  errors?: Record<string, string> // validation errors
}
