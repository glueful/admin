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

export interface APIErrorResponse extends APIResponse {
  success: false
}

// Helper type for wrapping API return types
export type APIResult<T> = Promise<APIResponse<T>>
