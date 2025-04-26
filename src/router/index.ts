import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'
import { useAuthStore } from '@/stores/auth'
const processedRoutes = setupLayouts(routes)

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: processedRoutes,
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    const authStore = useAuthStore()
    if (authStore.isAuthenticated) {
      return true
    }

    return {
      path: '/login',
    }
  }
})

if (import.meta.hot) {
  handleHotUpdate(router)
}

export default router
