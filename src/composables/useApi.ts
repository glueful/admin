import { useAuthStore } from '@/stores/auth'
import { createFetch, useFetch } from '@vueuse/core'

const { data } = await useFetch('/env.json').get().json()

// Create a fetch function with some options
const useApi = createFetch({
  baseUrl: data.value.apiBaseUrl,
  options: {
    async beforeFetch({ options }) {
      const authStore = useAuthStore()

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
      if (ctx.data) {
        ctx.error = ctx.data // Modifies the error
      }

      return ctx
    },
  },
})

export default useApi
