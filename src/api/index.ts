import useApi from '@/composables/useApi'
import type {
  APIResponse,
  APIErrorResponse,
  AuthResponse,
  User,
  TableMetadata,
  TableData,
  PaginatedResponse,
  ValidationErrorResponse,
} from '@/types/api'

// Improved executeApiCall function with better error handling and type safety
const executeApiCall = async <T>(apiCall: ReturnType<typeof useApi>) => {
  try {
    const { data, error } = await apiCall

    if (error.value) {
      // Check if it's a validation error
      const errorData = error.value as APIErrorResponse
      if (errorData.code === 422 && errorData.data?.fieldErrors) {
        return Promise.reject({
          success: false,
          message: errorData.message || 'Validation failed',
          code: errorData.code,
          data: errorData.data,
          isValidationError: true,
        } as ValidationErrorResponse)
      }

      // Standard error handling
      return Promise.reject({
        success: false,
        message: errorData.message || 'An unknown error occurred',
        code: errorData.code || 500,
        data: errorData.data || { generalErrors: [] },
      } as APIErrorResponse)
    }

    return data.value as APIResponse<T>
  } catch (e) {
    // Handle unexpected errors
    const errorResponse = e as APIErrorResponse
    throw {
      success: false,
      message: errorResponse.message || 'An unexpected error occurred',
      code: errorResponse.code || 500,
      data: errorResponse.data || { generalErrors: [] },
    } as APIErrorResponse
  }
}

// Auth API calls with proper typing
const auth = {
  login: async (credentials: { username: string; password: string }): Promise<AuthResponse> => {
    return executeApiCall<AuthResponse['data']>(
      useApi('/admin/login').post(credentials).json(),
    ) as Promise<AuthResponse>
  },

  refreshToken: async (token: string): Promise<AuthResponse> => {
    return executeApiCall<AuthResponse['data']>(
      useApi('/admin/refresh-token').post({ refresh_token: token }).json(),
    ) as Promise<AuthResponse>
  },

  getProfile: async (): Promise<APIResponse<User>> => {
    return executeApiCall<User>(useApi('/admin/profile').get().json())
  },
}

// Database API calls with proper typing
const db = {
  getTables: async (): Promise<APIResponse<string[]>> => {
    return executeApiCall<string[]>(useApi('/admin/db/tables').get().json())
  },

  getTable: async (table: string): Promise<APIResponse<TableMetadata>> => {
    return executeApiCall<TableMetadata>(useApi(`/admin/db/table/${table}`).get().json())
  },

  getTableData: async (
    table: string,
    params?: { page?: number; perPage?: number; sort?: string; order?: 'asc' | 'desc' },
  ): Promise<PaginatedResponse<TableData>> => {
    const query = new URLSearchParams()
    if (params?.page) query.append('page', params.page.toString())
    if (params?.perPage) query.append('perPage', params.perPage.toString())
    if (params?.sort) query.append('sort', params.sort)
    if (params?.order) query.append('order', params.order)

    const queryString = query.toString() ? `?${query.toString()}` : ''
    return executeApiCall<PaginatedResponse<TableData>['data']>(
      useApi(`/admin/db/table/${table}${queryString}`).get().json(),
    ) as Promise<PaginatedResponse<TableData>>
  },

  getTableDataById: async (table: string, id: string): Promise<APIResponse<TableData>> => {
    return executeApiCall<TableData>(useApi(`/admin/db/tables/${table}/data/${id}`).get().json())
  },

  createTableData: async (
    table: string,
    data: Record<string, any>,
  ): Promise<APIResponse<TableData>> => {
    return executeApiCall<TableData>(useApi(`/admin/db/tables/${table}/data`).post(data).json())
  },

  updateTableData: async (
    table: string,
    id: string,
    data: Record<string, any>,
  ): Promise<APIResponse<TableData>> => {
    return executeApiCall<TableData>(
      useApi(`/admin/db/tables/${table}/data/${id}`).put(data).json(),
    )
  },

  deleteTableData: async (
    table: string,
    id: string,
  ): Promise<APIResponse<{ deleted: boolean }>> => {
    return executeApiCall<{ deleted: boolean }>(
      useApi(`/admin/db/tables/${table}/data/${id}`).delete().json(),
    )
  },

  executeQuery: async (queryObj: {
    query: string
    params?: any[]
    allow_write?: boolean
  }): Promise<APIResponse<any>> => {
    return executeApiCall(useApi('/admin/db/query').post(queryObj).json())
  },
}

// System API calls
const system = {
  getStats: async (): Promise<
    APIResponse<{
      totalUsers: number
      totalTables: number
      systemHealth: {
        diskUsage: number
        memoryUsage: number
        cpuUsage: number
      }
    }>
  > => {
    return executeApiCall(useApi('/admin/system/stats').get().json())
  },
}

const api = {
  auth,
  db,
  system,
}

export default api
