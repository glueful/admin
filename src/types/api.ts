// types for API responses
export interface APIResponse<T = any[]> {
  success: boolean
  message: string
  code: number
  data: T
}

// You can also create more specific response types
export interface APISuccessResponse<T = any[]> extends APIResponse<T> {
  success: true
}

// Fix for the TypeScript error - provide a specific type for error data
export interface APIErrorResponse
  extends APIResponse<{
    fieldErrors?: Record<string, string[]>
    generalErrors?: string[]
    [key: string]: any
  }> {
  success: false
}

// Enhanced error response with structured field validation errors
export interface ValidationErrorResponse extends APIErrorResponse {
  data: {
    fieldErrors: Record<string, string[]>
    generalErrors: string[]
  }
}

// Pagination response type for paginated collections
export interface PaginatedResponse<T>
  extends APISuccessResponse<{
    items: T[]
    total: number
    page: number
    perPage: number
    lastPage: number
  }> {}

// Domain-specific data interfaces for common API responses
export interface UserProfile {
  first_name: string | null
  last_name: string | null
  photo_uuid: string | null
  photo_url: string | null
}

export interface User {
  uuid: string
  username: string
  email: string
  status: string
  created_at: string
  roles: string[]
  profile: UserProfile
  last_login: string
  is_admin: boolean
  remember_me: boolean
}

export interface TableMetadata {
  name: string
  columns: {
    name: string
    type: string
    nullable: boolean
    default?: any
    key?: string
    extra?: string
  }[]
  primaryKey: string
  foreignKeys?: {
    column: string
    references: {
      table: string
      column: string
    }
  }[]
}

export interface TableData {
  [key: string]: any
}

// Common typed responses
export type UserResponse = APISuccessResponse<User>
export type UsersResponse = APISuccessResponse<User[]>
export type PaginatedUsersResponse = PaginatedResponse<User>
export type TableMetadataResponse = APISuccessResponse<TableMetadata>
export type TableDataResponse = APISuccessResponse<TableData[]>
export type PaginatedTableDataResponse = PaginatedResponse<TableData>

// Authentication response types
export interface TokenData {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AuthResponse
  extends APISuccessResponse<{
    user: User
    tokens: TokenData
  }> {}

// Helper type for wrapping API return types
export type APIResult<T> = Promise<APIResponse<T>>
