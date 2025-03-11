import { createRouter, createWebHistory } from 'vue-router'
import { routes, handleHotUpdate } from 'vue-router/auto-routes'

for (const route of routes) {
  if (route.name === '/admin') {
    route.redirect = '/admin/home'
  }
}
routes.push({
  path: '/',
  redirect: '/admin/home',
})

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  if (to.meta.requiresAuth) {
    // check auth
    return {
      path: '/login',
    }
  }
})

export default router

if (import.meta.hot) {
  handleHotUpdate(router)
}
