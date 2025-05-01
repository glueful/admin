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
import type { CreateTableRequest } from '@/components/db/types'

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

  getTableColumns: async (table: string): Promise<APIResponse<TableMetadata['columns']>> => {
    return executeApiCall<TableMetadata['columns']>(
      useApi(`/admin/db/table/${table}/columns`).get().json(),
    )
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

  createTable: async (data: CreateTableRequest): Promise<APIResponse<TableData>> => {
    return executeApiCall<TableData>(useApi(`/admin/db/table/create`).post(data).json())
  },

  /**
   * Drop a database table
   */
  dropTable: async (tableName: string): Promise<APIResponse<null>> => {
    return executeApiCall<null>(
      useApi(`/admin/db/table/drop`).post({ table_name: tableName }).json(),
    )
  },

  /**
   * Get table size information
   */
  getTableSize: async (tableName: string): Promise<APIResponse<{ size: number; rows: number }>> => {
    return executeApiCall<{ size: number; rows: number }>(
      useApi(`/admin/db/table/${tableName}/size`).get().json(),
    )
  },

  /**
   * Add a column to an existing table
   */
  addColumn: async (
    tableName: string,
    column: { name: string; type: string; options?: Record<string, any> },
  ): Promise<APIResponse<{ table: string; column: any }>> => {
    return executeApiCall<{ table: string; column: any }>(
      useApi(`/admin/db/table/column/add`)
        .post({
          table_name: tableName,
          column,
        })
        .json(),
    )
  },

  /**
   * Add multiple columns to an existing table in a batch operation
   */
  addColumns: async (
    tableName: string,
    columns: Array<{ name: string; type: string; options?: Record<string, any> }>,
  ): Promise<APIResponse<{ table: string; columns_added: string[] }>> => {
    return executeApiCall<{ table: string; columns_added: string[] }>(
      useApi(`/admin/db/table/column/add-batch`)
        .post({
          table_name: tableName,
          columns,
        })
        .json(),
    )
  },

  /**
   * Drop a column from a table
   */
  dropColumn: async (tableName: string, columnName: string): Promise<APIResponse<null>> => {
    return executeApiCall<null>(
      useApi(`/admin/db/table/column/drop`)
        .post({
          table_name: tableName,
          column_name: columnName,
        })
        .json(),
    )
  },

  /**
   * Drop multiple columns from a table in a batch operation
   */
  dropColumns: async (
    tableName: string,
    columnNames: string[],
  ): Promise<APIResponse<{ table: string; columns_dropped: string[] }>> => {
    return executeApiCall<{ table: string; columns_dropped: string[] }>(
      useApi(`/admin/db/table/column/drop-batch`)
        .post({
          table_name: tableName,
          column_names: columnNames,
        })
        .json(),
    )
  },

  /**
   * Add an index to a table
   */
  addIndex: async (
    tableName: string,
    index: { column: string; type: 'INDEX' | 'UNIQUE'; name?: string },
  ): Promise<APIResponse<{ table: string; indexes_added: string[] }>> => {
    return executeApiCall<{ table: string; indexes_added: string[] }>(
      useApi(`/admin/db/table/index/add`)
        .post({
          table_name: tableName,
          index,
        })
        .json(),
    )
  },

  /**
   * Add multiple indexes to a table in a batch operation
   */
  addIndexes: async (
    tableName: string,
    indexes: Array<{ column: string; type: 'INDEX' | 'UNIQUE'; name?: string }>,
  ): Promise<APIResponse<{ table: string; indexes_added: string[] }>> => {
    return executeApiCall<{ table: string; indexes_added: string[] }>(
      useApi(`/admin/db/table/index/add-batch`)
        .post({
          table_name: tableName,
          indexes,
        })
        .json(),
    )
  },

  /**
   * Drop an index from a table
   */
  dropIndex: async (
    tableName: string,
    indexName: string,
  ): Promise<APIResponse<{ table: string; indexes_dropped: string[] }>> => {
    return executeApiCall<{ table: string; indexes_dropped: string[] }>(
      useApi(`/admin/db/table/index/drop`)
        .post({
          table_name: tableName,
          index_name: indexName,
        })
        .json(),
    )
  },

  /**
   * Drop multiple indexes from a table in a batch operation
   */
  dropIndexes: async (
    tableName: string,
    indexNames: string[],
  ): Promise<APIResponse<{ table: string; indexes_dropped: string[] }>> => {
    return executeApiCall<{ table: string; indexes_dropped: string[] }>(
      useApi(`/admin/db/table/index/drop-batch`)
        .post({
          table_name: tableName,
          index_names: indexNames,
        })
        .json(),
    )
  },

  /**
   * Add a foreign key constraint to a table
   */
  addForeignKey: async (
    tableName: string,
    foreignKey: {
      column: string
      references: string
      on: string
      name?: string
      on_delete?: string
      on_update?: string
    },
  ): Promise<APIResponse<{ table: string; constraints_added: string[] }>> => {
    return executeApiCall<{ table: string; constraints_added: string[] }>(
      useApi(`/admin/db/table/foreign-key/add`)
        .post({
          table_name: tableName,
          foreign_key: foreignKey,
        })
        .json(),
    )
  },

  /**
   * Add multiple foreign key constraints to a table in a batch operation
   */
  addForeignKeys: async (
    tableName: string,
    foreignKeys: Array<{
      column: string
      references: string
      on: string
      name?: string
      on_delete?: string
      on_update?: string
    }>,
  ): Promise<APIResponse<{ table: string; constraints_added: string[] }>> => {
    return executeApiCall<{ table: string; constraints_added: string[] }>(
      useApi(`/admin/db/table/foreign-key/add-batch`)
        .post({
          table_name: tableName,
          foreign_keys: foreignKeys,
        })
        .json(),
    )
  },

  /**
   * Drop a foreign key constraint from a table
   */
  dropForeignKey: async (
    tableName: string,
    constraintName: string,
  ): Promise<APIResponse<{ table: string; constraints_dropped: string[] }>> => {
    return executeApiCall<{ table: string; constraints_dropped: string[] }>(
      useApi(`/admin/db/table/foreign-key/drop`)
        .post({
          table_name: tableName,
          constraint_name: constraintName,
        })
        .json(),
    )
  },

  /**
   * Drop multiple foreign key constraints from a table in a batch operation
   */
  dropForeignKeys: async (
    tableName: string,
    constraintNames: string[],
  ): Promise<APIResponse<{ table: string; constraints_dropped: string[] }>> => {
    return executeApiCall<{ table: string; constraints_dropped: string[] }>(
      useApi(`/admin/db/table/foreign-key/drop-batch`)
        .post({
          table_name: tableName,
          constraint_names: constraintNames,
        })
        .json(),
    )
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
