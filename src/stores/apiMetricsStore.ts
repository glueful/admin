import { defineStore } from 'pinia'
import api from '@/api'
import type { APIErrorResponse } from '@/types/api'

interface EndpointMetric {
  endpoint: string
  method: string
  route: string
  calls: number
  avgResponseTime: number
  errorRate: number
  lastCalled: string | null
  category: string
}

interface RateLimitInfo {
  ip: string
  endpoint: string
  remaining: number
  reset: number
  limit: number
  usagePercentage: number
}

export const useApiMetricsStore = defineStore('apiMetrics', {
  state: () => ({
    loading: false,
    error: null as string | null,
    endpoints: [] as EndpointMetric[],
    totalEndpoints: 0,
    totalRequests: 0,
    avgResponseTime: 0,
    totalErrors: 0,
    errorRate: 0,
    rateLimits: [] as RateLimitInfo[],
    refreshTimestamp: null as Date | null,
    requestsOverTime: [] as { date: string; count: number }[],
    topEndpoints: [] as EndpointMetric[],
    categories: [] as string[],
    categoryDistribution: [] as { category: string; count: number }[],
  }),

  getters: {
    isLoading: (state) => state.loading,
    hasError: (state) => state.error !== null,
    getEndpointsGroupedByCategory: (state) => {
      const grouped = {} as Record<string, EndpointMetric[]>

      state.endpoints.forEach((endpoint) => {
        if (!grouped[endpoint.category]) {
          grouped[endpoint.category] = []
        }
        grouped[endpoint.category].push(endpoint)
      })

      return grouped
    },

    // Get top 5 endpoints by call volume
    getTopEndpoints: (state) => {
      return [...state.endpoints].sort((a, b) => b.calls - a.calls).slice(0, 5)
    },

    // Get endpoints with high error rates (>5%)
    getProblematicEndpoints: (state) => {
      return state.endpoints
        .filter((endpoint) => endpoint.errorRate > 5)
        .sort((a, b) => b.errorRate - a.errorRate)
    },

    // Rate limits approaching threshold (80% usage)
    getRateLimitsNearingThreshold: (state) => {
      return state.rateLimits
        .filter((limit) => limit.usagePercentage > 80)
        .sort((a, b) => b.usagePercentage - a.usagePercentage)
    },

    // Format the last refresh time
    lastRefreshed: (state) => {
      if (!state.refreshTimestamp) return 'Never'
      return new Date(state.refreshTimestamp).toLocaleString()
    },
  },

  actions: {
    async fetchApiMetrics() {
      this.loading = true
      this.error = null

      try {
        // Fetch API metrics from backend
        const response: any = await api.system.getApiMetrics()

        if (response.data) {
          // Process endpoint metrics
          this.endpoints = response.data.endpoints || []
          this.totalEndpoints = this.endpoints.length
          this.totalRequests = response.data.total_requests || 0
          this.avgResponseTime = response.data.avg_response_time || 0
          this.totalErrors = response.data.total_errors || 0
          this.errorRate = response.data.error_rate || 0

          // Process rate limit information
          this.rateLimits = response.data.rate_limits || []

          // Process time series data
          this.requestsOverTime = response.data.requests_over_time || []

          // Process top endpoints
          this.topEndpoints = response.data.top_endpoints || []

          // Process category information
          this.categories = response.data.categories || []
          this.categoryDistribution = response.data.category_distribution || []
        }

        this.refreshTimestamp = new Date()
      } catch (error: any) {
        const errorResponse = error as APIErrorResponse
        this.error = errorResponse.message || 'Failed to fetch API metrics'
        console.error('Error fetching API metrics:', error)
      } finally {
        this.loading = false
      }
    },

    async resetApiMetricsStats() {
      try {
        await api.system.resetApiMetrics()
        await this.fetchApiMetrics()
        return true
      } catch (error) {
        console.error('Error resetting API metrics:', error)
        return false
      }
    },
  },
})
