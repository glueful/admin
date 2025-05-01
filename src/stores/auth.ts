import { defineStore } from 'pinia'
// import { useUserStore } from './user'
import api from '@/api'
// Import the specific types we need
import type { APIErrorResponse, User } from '@/types/api'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: null as string | null,
    refreshToken: null as string | null,
    expiresAt: null as string | null,
    tokenType: 'Bearer',
    isLoading: false,
    authError: null as APIErrorResponse | null,
  }),

  getters: {
    isAuthenticated: (state) =>
      !!state.accessToken && !!state.expiresAt && new Date(state.expiresAt) > new Date(),
    isTokenExpiringSoon: (state) => {
      if (!state.expiresAt) return false
      const expiryTime = new Date(state.expiresAt).getTime()
      const currentTime = new Date().getTime()
      // Check if token expires in less than 5 minutes
      return expiryTime - currentTime < 5 * 60 * 1000
    },
    getAuthHeader: (state) => {
      return state.accessToken ? `${state.tokenType} ${state.accessToken}` : ''
    },
  },

  actions: {
    async login(credentials: { username: string; password: string }) {
      this.isLoading = true
      this.authError = null

      try {
        const response = await api.auth.login(credentials)

        // We don't need to check response.success === false since TypeScript knows
        // that AuthResponse always has success: true

        // Extract token data from response
        const tokenData = response.data.tokens
        this.user = response.data.user

        // Calculate expiration time from expires_in (in seconds)
        const expirationTime = new Date()
        expirationTime.setSeconds(expirationTime.getSeconds() + tokenData.expires_in)

        // Set authentication state
        this.setTokens({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expirationTime.toISOString(),
          tokenType: tokenData.token_type,
        })

        return true
      } catch (error: any) {
        // Handle structured errors from our API
        if (error.code && error.message) {
          // Handle explicit error response
          const errorMsg = error?.message || 'Login failed'
          const errorCode = error?.code || 401
          throw {
            success: false,
            message: errorMsg,
            code: errorCode,
            data: error?.data || { generalErrors: [] },
          } as APIErrorResponse
        }

        return { success: false, error: error.message }
      } finally {
        this.isLoading = false
      }
    },

    setTokens(tokens: {
      accessToken: string
      refreshToken: string
      expiresAt: string
      tokenType?: string
    }) {
      this.accessToken = tokens.accessToken
      this.refreshToken = tokens.refreshToken
      this.expiresAt = tokens.expiresAt
      this.tokenType = tokens.tokenType || 'Bearer'
    },

    // Other actions remain similar to before...
    async logout() {
      this.clearTokens()
      this.user = null
      localStorage.clear()
    },

    async refreshAccessToken() {
      // Only attempt to refresh if we have a refresh token
      if (!this.refreshToken) {
        return false
      }

      try {
        this.isLoading = true
        this.authError = null

        // Call the API refresh token endpoint
        const response = await api.auth.refreshToken(this.refreshToken)

        // Extract token data from response
        const tokenData = response.data.tokens
        this.user = response.data.user

        // Calculate expiration time from expires_in (in seconds)
        const expirationTime = new Date()
        expirationTime.setSeconds(expirationTime.getSeconds() + tokenData.expires_in)

        // Set updated authentication state
        this.setTokens({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expirationTime.toISOString(),
          tokenType: tokenData.token_type,
        })

        return true
      } catch (error: any) {
        // Handle token refresh errors
        this.authError = {
          success: false,
          message: error?.message || 'Failed to refresh token',
          code: error?.code || 401,
          data: error?.data || { generalErrors: ['Session expired, please login again'] },
        }

        // If refresh fails, clear tokens and force re-login
        this.clearTokens()
        return false
      } finally {
        this.isLoading = false
      }
    },

    clearTokens() {
      this.accessToken = null
      this.refreshToken = null
      this.expiresAt = null
      this.authError = null
    },
  },

  persist: {
    enabled: true,
    strategies: [
      {
        storage: localStorage,
        paths: ['refreshToken', 'accessToken', 'expiresAt', 'tokenType', 'user'],
      },
    ],
  },
})
