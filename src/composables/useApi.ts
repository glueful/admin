import { useAuthStore } from '@/stores/auth'
import { createFetch, useFetch } from '@vueuse/core'

const { data } = await useFetch('/env.json').get().json()

// Create a fetch function with some options
const useApi = createFetch({
  baseUrl: data.value.apiBaseUrl,
  options: {
    async beforeFetch({ options }) {
      const authStore = useAuthStore()

      // If the token is expiring soon, try to refresh it first
      if (authStore.isAuthenticated && authStore.isTokenExpiringSoon) {
        await authStore.refreshAccessToken()
      }

      // Set default headers
      options.headers = {
        // Default Content-Type as application/json
        'Content-Type': 'application/json',
        // Add other default headers you might need
        Accept: 'application/json',
        // Spread user-provided headers (will override defaults if provided)
        ...options.headers,
      }

      // Add authorization header if we have a token and it wasn't explicitly set
      if (authStore.accessToken) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${authStore.accessToken}`,
        }
      }

      return { options }
    },
    onFetchError(ctx) {
      // Handle 401 Unauthorized errors (potentially expired token)
      if (ctx.response && ctx.response.status === 401) {
        const authStore = useAuthStore()
        // If token refresh failed earlier, logout the user
        if (authStore.authError) {
          authStore.logout()
          // Could also redirect to login page here if needed
        }
      }

      if (ctx.data) {
        ctx.error = ctx.data // Modifies the error
      }

      return ctx
    },
  },
})

export default useApi
