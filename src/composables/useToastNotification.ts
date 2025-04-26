import type { ToastProps } from '@nuxt/ui'

// Define the toast options interface
interface ToastOptions {
  title?: string
  description?: string
  color?: ToastProps['color']
  icon?: string
  timeout?: number
  closeIcon?: string
  [key: string]: any // For any additional properties
}

// Define our return type with all the toast methods
interface ToastNotification {
  success: (options?: ToastOptions) => void
  error: (options?: ToastOptions) => void
  info: (options?: ToastOptions) => void
  warn: (options?: ToastOptions) => void
  custom: (options?: ToastOptions) => void
}

export function useToastNotification(): ToastNotification {
  const toast = useToast()

  const showToast: ToastNotification = {
    success: (options: ToastOptions = {}) => {
      toast.add({
        title: options.title || 'Success!',
        description: options.description || 'Operation completed successfully.',
        color: 'success',
        // icon: 'check-circle',
        ...options,
      })
    },

    error: (options: ToastOptions = {}) => {
      toast.add({
        title: options.title || 'Error!',
        description: options.description || 'There was a problem with your request.',
        color: 'error',
        icon: 'i-lucide-user-round-x',
        ...options,
      })
    },

    info: (options: ToastOptions = {}) => {
      toast.add({
        title: options.title || 'Information',
        description: options.description || 'Here is some information for you.',
        color: 'info',
        // icon: 'info',
        ...options,
      })
    },

    warn: (options: ToastOptions = {}) => {
      toast.add({
        title: options.title || 'Warning!',
        description: options.description || 'Please be aware of this important notice.',
        color: 'warning',
        // icon: 'alert-triangle',
        ...options,
      })
    },

    // Original basic toast function for custom needs
    custom: (options: ToastOptions = {}) => {
      toast.add({
        title: options.title || 'Notification',
        description: options.description || '',
        ...options,
      })
    },
  }

  return showToast
}
