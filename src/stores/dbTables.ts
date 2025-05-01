import { defineStore } from 'pinia'
import api from '@/api'
import type { CreateTableRequest } from '@/components/db/types'

export interface TableQueryOptions {
  page?: number
  perPage?: number
  filters?: Record<string, any>
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export const useDBTablesStore = defineStore('dbTables', {
  state: () => ({
    tables: [],
    currentTable: null,
    tableData: [],
    tableColumns: [],
    columns: [],
    currentRecord: null,
    isLoading: false,
    dbError: null,
    pagination: {
      page: 1,
      perPage: 25,
      total: 0,
      lastPage: 1,
      hasMore: false,
      from: 1,
      to: 1,
    },
    filters: {},
    sortBy: null as string | null,
    sortDirection: 'asc',
  }),

  getters: {
    hasLoadedTables: (state) => state.tables.length > 0,
    getTableById: (state) => (tableId: any) => {
      return state.tables.find((table: any) => table.id === tableId || table.name === tableId)
    },
    getCurrentTableColumns: (state: any) => {
      return state.currentTable ? state.currentTable.columns : []
    },
    getPaginatedData: (state) => {
      return state.tableData
    },
    getRecordById: (state) => (id: any) => {
      return state.tableData.find((record: any) => record.id === id)
    },
  },

  actions: {
    async fetchTables() {
      this.isLoading = true
      this.dbError = null

      try {
        const response: any = await api.db.getTables()
        if (!response || response.success === false) {
          const errorMsg = response?.message || 'Failed to fetch tables'
          const errorCode = response?.code || 500
          throw { message: errorMsg, code: errorCode, data: response?.data || [] }
        }

        this.tables = response.data
        return response.data
      } catch (error: any) {
        this.dbError = error.message || 'An error occurred while fetching tables'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchTableData(tableName: string, options: TableQueryOptions = {}) {
      this.isLoading = true
      this.dbError = null

      // Set optional parameters from the options
      if (options.page) this.pagination.page = options.page
      if (options.perPage) this.pagination.perPage = options.perPage
      if (options.filters) this.filters = options.filters
      if (options.sortBy) this.sortBy = options.sortBy
      if (options.sortDirection) this.sortDirection = options.sortDirection

      try {
        const response: any = await api.db.getTableData(tableName)
        if (!response || response.success === false) {
          const errorMsg = response?.message || `Failed to fetch data for table: ${tableName}`
          const errorCode = response?.code || 500
          throw { message: errorMsg, code: errorCode, data: response?.data || [] }
        }

        this.tableData = response.data
        this.tableColumns = response.columns || []

        // Update pagination info from the response
        this.pagination = {
          page: response.current_page,
          perPage: response.per_page,
          total: response.total,
          lastPage: response.last_page,
          hasMore: response.has_more,
          from: response.from,
          to: response.to,
        }

        // If this is the first data fetch for this table, also set the current table schema
        // if (!this.currentTable || this.currentTable.name !== tableName) {
        //   await this.fetchTable(tableName);
        // }

        return {
          records: this.tableData,
          pagination: this.pagination,
        }
      } catch (error: any) {
        this.dbError =
          error.message || `An error occurred while fetching data for table: ${tableName}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    // async createTableRow(tableName: string, data: any) {
    //   this.isLoading = true
    //   this.dbError = null

    //   try {
    //     const response: any = await api.db.createTableData(tableName, data)
    //     if (!response || response.success === false) {
    //       const errorMsg = response?.message || `Failed to create record in table: ${tableName}`
    //       const errorCode = response?.code || 500
    //       throw { message: errorMsg, code: errorCode, data: response?.data || [] }
    //     }

    //     // Refresh the table data to reflect the new record
    //     await this.fetchTableData(tableName, {
    //       page: this.pagination.page,
    //       perPage: this.pagination.perPage,
    //     })

    //     return response.data
    //   } catch (error: any) {
    //     this.dbError =
    //       error.message || `An error occurred while creating record in table: ${tableName}`
    //     throw error
    //   } finally {
    //     this.isLoading = false
    //   }
    // },

    async updateTableRow(tableName: string, id: string | number, data: any) {
      this.isLoading = true
      this.dbError = null

      try {
        const response: any = await api.db.updateTableData(tableName, id.toString(), data)
        if (!response || response.success === false) {
          const errorMsg = response?.message || `Failed to update record in table: ${tableName}`
          const errorCode = response?.code || 500
          throw { message: errorMsg, code: errorCode, data: response?.data || [] }
        }

        // Refresh the table data to reflect the updated record
        await this.fetchTableData(tableName, {
          page: this.pagination.page,
          perPage: this.pagination.perPage,
        })

        return response.data
      } catch (error: any) {
        this.dbError =
          error.message || `An error occurred while updating record in table: ${tableName}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async deleteTableRow(tableName: string, id: string | number) {
      this.isLoading = true
      this.dbError = null

      try {
        const response: any = await api.db.deleteTableData(tableName, id.toString())
        if (!response || response.success === false) {
          const errorMsg = response?.message || `Failed to delete record from table: ${tableName}`
          const errorCode = response?.code || 500
          throw { message: errorMsg, code: errorCode, data: response?.data || [] }
        }

        // Refresh the table data to reflect the deletion
        await this.fetchTableData(tableName, {
          page: this.pagination.page,
          perPage: this.pagination.perPage,
        })

        return true
      } catch (error: any) {
        this.dbError =
          error.message || `An error occurred while deleting record from table: ${tableName}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async fetchTableColumns(tableName: string) {
      this.isLoading = true
      this.dbError = null

      try {
        const response: any = await api.db.getTableColumns(tableName)
        if (!response || response.success === false) {
          const errorMsg = response?.message || `Failed to fetch columns for table: ${tableName}`
          const errorCode = response?.code || 500
          throw { message: errorMsg, code: errorCode, data: response?.data || [] }
        }

        this.columns = response.data
        return response.data
      } catch (error: any) {
        this.dbError =
          error.message || `An error occurred while fetching columns for table: ${tableName}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createTable(tableData: CreateTableRequest) {
      this.isLoading = true
      this.dbError = null

      try {
        const response: any = await api.db.createTable(tableData)
        if (!response || response.success === false) {
          const errorMsg = response?.message || `Failed to create table: ${tableData.table_name}`
          const errorCode = response?.code || 500
          throw { message: errorMsg, code: errorCode, data: response?.data || [] }
        }

        // Refresh the tables list to include the new table
        await this.fetchTables()

        return response
      } catch (error: any) {
        this.dbError =
          error.message || `An error occurred while creating table: ${tableData.table_name}`
        throw error
      } finally {
        this.isLoading = false
      }
    },

    clearTableData() {
      this.tableData = []
      this.currentRecord = null
      this.pagination = {
        page: 1,
        perPage: 25,
        total: 0,
        lastPage: 1,
        hasMore: false,
        from: 1,
        to: 1,
      }
      this.filters = {}
      this.sortBy = null
      this.sortDirection = 'asc'
    },

    resetState() {
      this.tables = []
      this.currentTable = null
      this.clearTableData()
      this.dbError = null
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        storage: localStorage,
        paths: ['pagination.perPage'],
      },
    ],
  },
})
