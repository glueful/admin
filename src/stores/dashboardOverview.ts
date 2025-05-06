import { defineStore } from 'pinia'
import api from '@/api'
import type { APIErrorResponse } from '@/types/api'

export const useDashboardOverviewStore = defineStore('dashboardOverview', {
  state: () => ({
    dbStats: {} as any,
    migrations: {} as any,
    jobs: {} as any,
    extensions: {} as any,
    permissions: {} as any,
    systemHealth: {} as any,
    refreshTimestamp: null as Date | null,
  }),

  getters: {
    isLoading: (state) =>
      state.dbStats.loading ||
      state.migrations.loading ||
      state.jobs.loading ||
      state.extensions.loading ||
      state.systemHealth.loading ||
      state.permissions.loading,

    hasErrors: (state) =>
      !!state.dbStats.error ||
      !!state.migrations.error ||
      !!state.jobs.error ||
      !!state.extensions.error ||
      !!state.systemHealth.error ||
      !!state.permissions.error,

    // Format last refresh time in a human-readable format
    lastRefreshed: (state) => {
      if (!state.refreshTimestamp) return 'Never'
      return new Date(state.refreshTimestamp).toLocaleString()
    },

    // Get the total number of pending migrations
    pendingMigrationsCount: (state) => state.migrations.totalPending,

    // Get database statistics
    databaseStats: (state) => state.dbStats,

    // Get largest tables by size
    largestTables: (state) => state.dbStats.largestTables,

    // Get upcoming jobs
    upcomingJobs: (state) => state.jobs.upcoming,

    // Get recently executed jobs
    recentJobs: (state) => state.jobs.recentlyRun,

    // Get failed jobs
    failedJobs: (state) => state.jobs.failed,

    // Get extension statistics
    extensionStats: (state) => ({
      total: state.extensions.total,
      enabled: state.extensions.enabled,
      disabled: state.extensions.disabled,
    }),

    // Get system health metrics
    systemHealthMetrics: (state) => state.systemHealth,
  },

  actions: {
    // Fetch all dashboard data in parallel
    async fetchDashboardData() {
      // Start all fetch operations in parallel
      await Promise.allSettled([
        // this.fetchDbStats(),
        // this.fetchMigrations(),
        // this.fetchJobs(),
        // this.fetchExtensions(),
        // this.fetchSystemHealth(),
        // this.fetchPermissions(),
      ])

      // Update refresh timestamp
      this.refreshTimestamp = new Date()
    },

    // Fetch database statistics
    async fetchDbStats() {
      this.dbStats.loading = true
      this.dbStats.error = null

      try {
        // Get list of tables with their sizes
        const response: any = await api.db.getDBStats()
        const tables = response.data.tables || []

        this.dbStats.totalTables = response.data.total_tables

        // Sort tables by size and get the largest ones
        const largestTables = [...tables].sort((a, b) => b.size - a.size).slice(0, 5)

        this.dbStats.largestTables = largestTables
        this.dbStats.allTables = tables
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.dbStats.error = errorResponse.message || 'Failed to fetch database statistics'
        console.error('Error fetching database stats:', error)
      } finally {
        this.dbStats.loading = false
      }
    },

    // Fetch migration information
    async fetchMigrations() {
      this.migrations.loading = true
      this.migrations.error = null

      try {
        // Use the new API method instead of direct useApi call
        const response = await api.migrations.getPendingMigrations()

        // Update state with response data
        this.migrations.pending = response.data.migrations || []
        this.migrations.totalPending = this.migrations.pending.length
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.migrations.error = errorResponse.message || 'Failed to fetch migrations'
        console.error('Error fetching migrations:', error)
      } finally {
        this.migrations.loading = false
      }
    },

    // Fetch scheduled jobs
    async fetchJobs() {
      this.jobs.loading = true
      this.jobs.error = null

      try {
        // Use the new API method instead of direct useApi call
        const response = await api.jobs.getAllJobs()
        const jobs = response.data.jobs || []

        // Process jobs into upcoming, recent, and failed
        const now = new Date()

        this.jobs.upcoming = jobs
          .filter((job) => new Date(job.next_run) > now)
          .sort((a, b) => new Date(a.next_run).getTime() - new Date(b.next_run).getTime())
          .slice(0, 5)

        this.jobs.recentlyRun = jobs
          .filter((job) => job.last_run)
          .sort((a, b) => new Date(b.last_run!).getTime() - new Date(a.last_run!).getTime())
          .slice(0, 5)

        this.jobs.failed = jobs.filter((job) => job.status === 'failed').slice(0, 5)
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.jobs.error = errorResponse.message || 'Failed to fetch scheduled jobs'
        console.error('Error fetching jobs:', error)
      } finally {
        this.jobs.loading = false
      }
    },

    // Fetch extensions
    async fetchExtensions() {
      this.extensions.loading = true
      this.extensions.error = null

      try {
        // Use the API method to get extensions
        const response = await api.extensions.getAllExtensions()

        // Handle the new response structure where extensions are in response.data.extensions
        const extensions = response.data.extensions || []

        this.extensions.list = extensions
        this.extensions.total = extensions.length
        this.extensions.enabled = extensions.filter((ext: any) => ext.enabled).length
        this.extensions.disabled = extensions.filter((ext: any) => !ext.enabled).length
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.extensions.error = errorResponse.message || 'Failed to fetch extensions'
        console.error('Error fetching extensions:', error)
      } finally {
        this.extensions.loading = false
      }
    },

    // Fetch system health metrics
    async fetchSystemHealth() {
      this.systemHealth.loading = true
      this.systemHealth.error = null

      try {
        const response: any = await api.system.getHealthStats()

        if (response.data) {
          // Store complete raw response
          this.systemHealth.raw = response.data

          // Map specific values for direct access
          this.systemHealth.phpVersion = response.data.php?.version || 'Unknown'
          this.systemHealth.memoryUsage = {
            current: response.data.memory?.current_usage || '0 B',
            peak: response.data.memory?.peak_usage || '0 B',
          }

          // Database metrics
          this.systemHealth.database = {
            status: response.data.database?.status || 'Unknown',
            responseTime: response.data.database?.response_time_ms || 0,
            tableCount: response.data.database?.table_count || 0,
            totalSize: response.data.database?.total_size || '0 B',
          }

          // File system metrics
          this.systemHealth.fileSystem = {
            freeSpace: response.data.file_system?.storage_free_space || '0 B',
            totalSpace: response.data.file_system?.storage_total_space || '0 B',
            usagePercent: response.data.file_system?.storage_usage_percent || '0%',
          }

          // Cache status
          this.systemHealth.cache = {
            type: response.data.cache?.type || 'None',
            status: response.data.cache?.status || 'disabled',
            memoryUsage: response.data.cache?.memory_usage || '0 B',
            hitRate: response.data.cache?.hit_rate || '0%',
          }

          // Extension stats
          this.systemHealth.extensions = {
            total: response.data.extensions?.total_count || 0,
            enabled: response.data.extensions?.enabled_count || 0,
            list: response.data.extensions?.extensions || [],
          }

          // Server load
          this.systemHealth.serverLoad = response.data.server_load || {
            '1min': 0,
            '5min': 0,
            '15min': 0,
          }

          // App uptime
          this.systemHealth.uptime = response.data.app_uptime?.formatted || 'Unknown'

          // Recent logs
          this.systemHealth.recentLogs = response.data.logs?.recent_logs?.recent_entries || []

          // Time information
          this.systemHealth.time = {
            current: response.data.time?.current || new Date().toISOString(),
            timezone: response.data.time?.timezone || 'UTC',
          }
        }
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.systemHealth.error = errorResponse.message || 'Failed to fetch system health'
        console.error('Error fetching system health:', error)
      } finally {
        this.systemHealth.loading = false
      }
    },

    // Fetch permissions
    async fetchPermissions() {
      this.permissions.loading = true
      this.permissions.error = null

      try {
        // Use the new API method instead of direct useApi call
        const response = await api.permissions.getAllPermissions()

        this.permissions.total = response.data.permissions?.length || 0
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.permissions.error = errorResponse.message || 'Failed to fetch permissions'
        console.error('Error fetching permissions:', error)
      } finally {
        this.permissions.loading = false
      }
    },

    // Run a specific job
    async runJob(jobId: number) {
      try {
        // Use the new API method instead of direct useApi call
        await api.jobs.runJob(jobId)

        // Refresh jobs data after running a job
        await this.fetchJobs()
        return true
      } catch (error) {
        console.error('Error running job:', error)
        return false
      }
    },

    // Enable or disable an extension
    async toggleExtension(name: string, enable: boolean) {
      try {
        // Use the new API methods instead of direct useApi call
        if (enable) {
          await api.extensions.enableExtension(name)
        } else {
          await api.extensions.disableExtension(name)
        }

        // Refresh extensions data
        await this.fetchExtensions()
        return true
      } catch (error) {
        console.error(`Error ${enable ? 'enabling' : 'disabling'} extension:`, error)
        return false
      }
    },

    // Run all pending migrations
    async runMigrations() {
      this.migrations.loading = true
      this.migrations.error = null

      try {
        // Use the API method to run migrations
        const response = await api.migrations.runPendingMigrations()

        // Refresh migrations data after running them
        await this.fetchMigrations()

        return {
          success: true,
          message: 'Migrations applied successfully',
          applied: response.data.applied || [],
        }
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.migrations.error = errorResponse.message || 'Failed to run migrations'
        console.error('Error running migrations:', error)

        return {
          success: false,
          message: this.migrations.error,
          applied: [],
        }
      } finally {
        this.migrations.loading = false
      }
    },
  },
})
