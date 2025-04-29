import { defineStore } from 'pinia'
import api from '@/api'

export interface SQLQuery {
  id?: string | number
  query: string
  params?: any[]
  allow_write?: boolean
  created_at?: string
  execution_time?: number
  saved?: boolean
  name?: string
  description?: string // Added description field for better query documentation
}

export interface SQLResult {
  success: boolean
  data?: any[]
  columns?: string[]
  affected_rows?: number
  execution_time?: number
  message?: string
  error?: string
}

export const useSQLQueriesStore = defineStore('sqlQueries', {
  state: () => ({
    queries: [] as SQLQuery[],
    currentQuery: null as SQLQuery | null,
    queryHistory: [] as SQLQuery[],
    savedQueries: [] as SQLQuery[],
    queryResults: null as SQLResult | null,
    isLoading: false,
    error: null as string | null,
    predefinedQueries: [] as SQLQuery[], // Queries loaded from the configuration
  }),

  getters: {
    getQueryHistory: (state) => state.queryHistory,
    getSavedQueries: (state) => state.savedQueries,
    getCurrentQuery: (state) => state.currentQuery,
    getQueryResults: (state) => state.queryResults,
    hasError: (state) => !!state.error,
    getPredefinedQueries: (state) => state.predefinedQueries,

    // Get all queries (both saved and predefined)
    getAllQueries: (state) => [...state.savedQueries, ...state.predefinedQueries],
  },

  actions: {
    async executeQuery(query: SQLQuery) {
      this.isLoading = true
      this.error = null

      try {
        // Add the query to history if it's not already there
        if (!this.queryHistory.some((q) => q.query === query.query)) {
          this.queryHistory.unshift({
            ...query,
            created_at: new Date().toISOString(),
          })

          // Limit history to 50 items
          if (this.queryHistory.length > 50) {
            this.queryHistory.pop()
          }
        }

        this.currentQuery = query

        // Call the API to execute the query
        const response: any = await api.db.executeQuery(query)

        if (!response || response.success === false) {
          const errorMsg = response?.message || 'Failed to execute SQL query'
          throw new Error(errorMsg)
        }

        // Extract results based on the API response format
        // The response format is:
        // {
        //   success: true,
        //   message: "Query executed successfully",
        //   code: 200,
        //   data: {
        //     query: "SELECT * FROM users LIMIT 10;",
        //     results: [ {...}, {...} ],
        //     count: 1
        //   }
        // }

        const resultData = response.data?.results || []
        const queryCount = response.data?.count || resultData.length || 0

        // Extract columns from the first result object if available
        let columns: string[] = []
        if (resultData.length > 0 && typeof resultData[0] === 'object') {
          // Use the keys from the first result object as columns
          columns = Object.keys(resultData[0])
        }

        this.queryResults = {
          success: true,
          data: resultData,
          columns: columns,
          affected_rows: queryCount,
          execution_time: response.execution_time || 0,
          message: response.message || 'Query executed successfully',
        }

        return this.queryResults
      } catch (error: any) {
        this.error = error.message || 'An error occurred while executing the SQL query'
        this.queryResults = {
          success: false,
          error: this.error || undefined,
          message: this.error || undefined,
        }
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async saveQuery(query: SQLQuery) {
      this.isLoading = true
      this.error = null

      try {
        if (!query.name) {
          throw new Error('Query name is required')
        }

        // Generate a unique ID for the query
        const savedQuery = {
          ...query,
          id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          saved: true,
          created_at: new Date().toISOString(),
        }

        // Check for duplicate names
        if (this.savedQueries.some((q) => q.name === query.name)) {
          throw new Error(`A query with the name "${query.name}" already exists`)
        }

        // Add to saved queries in local state
        this.savedQueries.push(savedQuery)

        return savedQuery
      } catch (error: any) {
        this.error = error.message || 'An error occurred while saving the SQL query'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async loadSavedQueries() {
      this.isLoading = true
      this.error = null

      try {
        // Queries are already loaded from localStorage via Pinia persistence
        // Nothing to do here, just return the current state
        return this.savedQueries
      } catch (error: any) {
        this.error = error.message || 'An error occurred while loading saved SQL queries'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async deleteSavedQuery(id: string | number) {
      this.isLoading = true
      this.error = null

      try {
        // Remove from saved queries in local state
        const initialLength = this.savedQueries.length
        this.savedQueries = this.savedQueries.filter((q) => q.id !== id)

        // Check if query was actually deleted
        if (this.savedQueries.length === initialLength) {
          throw new Error(`Query with ID ${id} not found`)
        }

        return true
      } catch (error: any) {
        this.error = error.message || 'An error occurred while deleting the saved SQL query'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Deletes all saved queries
     */
    async deleteAllSavedQueries() {
      this.isLoading = true
      this.error = null

      try {
        // Clear the saved queries array
        this.savedQueries = []

        return true
      } catch (error: any) {
        this.error = error.message || 'An error occurred while deleting saved queries'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    setCurrentQuery(query: SQLQuery) {
      this.currentQuery = query
    },

    clearQueryResults() {
      this.queryResults = null
    },

    clearError() {
      this.error = null
    },

    clearQueryHistory() {
      this.queryHistory = []
    },

    /**
     * Exports all saved queries to a JSON file that users can download
     */
    exportQueries() {
      try {
        const queries = this.savedQueries
        const dataStr = JSON.stringify(queries, null, 2)
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

        const exportFileDefaultName = `sql-queries-${new Date().toISOString().split('T')[0]}.json`
        const linkElement = document.createElement('a')
        linkElement.setAttribute('href', dataUri)
        linkElement.setAttribute('download', exportFileDefaultName)
        linkElement.click()

        return true
      } catch (error) {
        console.error('Failed to export queries', error)
        this.error = 'Failed to export queries'
        return false
      }
    },

    /**
     * Imports queries from a JSON file
     * @param file The file object from the input element
     */
    async importQueries(file: File): Promise<boolean> {
      try {
        return new Promise((resolve, reject) => {
          const reader = new FileReader()

          reader.onload = (e) => {
            try {
              const result = e.target?.result
              if (typeof result !== 'string') {
                throw new Error('Invalid file format')
              }

              const queries = JSON.parse(result) as SQLQuery[]

              // Validate the imported queries
              if (!Array.isArray(queries)) {
                throw new Error('Imported data is not an array of queries')
              }

              // Add each query, skipping duplicates based on name
              const existingNames = new Set(this.savedQueries.map((q) => q.name))
              const newQueries = queries.filter((q) => q.name && !existingNames.has(q.name))

              this.savedQueries = [...this.savedQueries, ...newQueries]

              resolve(true)
            } catch (error: any) {
              this.error = `Failed to parse imported queries: ${error.message}`
              reject(error)
            }
          }

          reader.onerror = () => {
            this.error = 'Error reading file'
            reject(new Error('Error reading file'))
          }

          reader.readAsText(file)
        })
      } catch (error: any) {
        this.error = error.message || 'An error occurred while importing queries'
        return false
      }
    },

    /**
     * Loads predefined queries from the configuration file
     */
    async loadPredefinedQueries() {
      try {
        // Fetch predefined queries from the dedicated file
        const response = await fetch('/predefined-queries.json')
        const predefinedQueries = await response.json()

        if (Array.isArray(predefinedQueries)) {
          this.predefinedQueries = predefinedQueries.map((query: any) => ({
            ...query,
            id: `predefined-${query.name}`,
            saved: true,
          }))
        }

        return this.predefinedQueries
      } catch (error) {
        console.error('Failed to load predefined queries', error)
        return []
      }
    },
  },

  // Persist query history and saved queries to localStorage
  persist: {
    enabled: true,
    strategies: [
      {
        storage: localStorage,
        paths: ['queryHistory', 'savedQueries'],
      },
    ],
  },
})
