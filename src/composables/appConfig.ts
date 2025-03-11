// Example implementation of useAppConfig

import { reactive, readonly } from 'vue'

// Default app config structure
const defaultAppConfig = {
  name: 'My App',
  description: 'A simple app',
  ui: {
    icons: {
      eye: 'i-heroicons-eye',
      eyeOff: 'i-heroicons-eye-slash',
      menu: 'i-lucide-menu',
      close: 'i-lucide-x',
    },
    authForm: {
      slots: {
        root: 'w-full space-y-6',
        header: 'flex flex-col text-center',
        leading: 'mb-2',
        leadingIcon: 'size-8 shrink-0',
        title: 'text-xl text-pretty font-semibold text-(--ui-text-highlighted)',
        description: 'mt-1 text-base text-pretty text-(--ui-text-muted)',
        body: 'gap-y-6 flex flex-col',
        providers: 'space-y-3',
        separator: '',
        form: 'space-y-5',
        footer: 'text-sm text-center text-(--ui-text-muted) mt-2',
      },
    },
  },
}

// Create a reactive state
const appConfigState = reactive({ ...defaultAppConfig })

/**
 * Composable that provides access to the application configuration
 * This matches the function imported from '#imports' in the AuthForm.vue
 */
export function useAppConfig() {
  // Return a readonly version of the config to prevent unintended mutations
  return readonly(appConfigState)
}

// Optional: Method to update app config at runtime
export function updateAppConfig(config: Partial<typeof defaultAppConfig>) {
  Object.assign(appConfigState, config)
}
