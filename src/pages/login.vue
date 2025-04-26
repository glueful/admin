<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useToastNotification } from '@/composables/useToastNotification'

const router = useRouter()
const authStore = useAuthStore()
const showToast = useToastNotification()
const passwordVisibility = ref(false)

// Add this session check that runs when the component mounts
onMounted(() => {
  console.log('Checking session')
  if (authStore.isAuthenticated) {
    console.log('User is already authenticated')
    // router.push('/admin/home')
  }
})

const state = reactive({
  username: undefined,
  password: undefined,
})

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.username) errors.push({ name: 'username', message: 'Enter your email or username ' })
  if (!state.password) errors.push({ name: 'password', message: 'Enter your password' })
  return errors
}

async function onSubmit(event: FormSubmitEvent<any>) {
  try {
    const res = await authStore.login(event.data)
    if (res) {
      router.push('/')
    }
  } catch (e: any) {
    showToast.error({
      title: 'Login Failed',
      description: e.message || 'An error occurred while logging in',
    })
  }
}
</script>

<template>
  <div
    class="flex items-center justify-center min-h-screen relative overflow-hidden"
    :class="{ 'bg-[var(--loginPageBg)]': true, 'dark:bg-[#1f1c1d]': true }"
  >
    <div class="absolute inset-0 flex items-center justify-center">
      <img
        src="../assets/bg_shape.svg"
        class="absolute transform -translate-x-55 translate-y-10 w-[600px] opacity-80 dark:opacity-40"
      />
    </div>
    <div class="absolute inset-0 flex items-center justify-center">
      <img src="../assets/form_bg.svg" class="dark:opacity-70" />
    </div>

    <!-- Centered Transparent Container with White SVG Background -->
    <div class="relative z-10 bg-transparent p-0 rounded-2xl w-96 mb-10">
      <div class="mb-5">
        <img src="../assets/logo_full.svg" width="150" class="mb-5" />
        <img src="../assets/line.svg" class="-ml-15" />
      </div>
      <div class="flex flex-col">
        <UForm :validate="validate" :state="state" @submit="onSubmit" class="space-y-5">
          <UFormField
            label="Username"
            name="username"
            size="lg"
            class="text-[var(--brand-dark)] dark:text-[var(--brand-light)]"
          >
            <UInput v-model="state.username" class="w-full" color="primary" />
          </UFormField>

          <UFormField
            label="Password"
            name="password"
            size="lg"
            class="text-[var(--brand-dark)] dark:text-[var(--brand-light)]"
          >
            <UInput
              v-model="state.password"
              :type="passwordVisibility ? 'text' : 'password'"
              class="w-full"
              color="primary"
            >
              <template #trailing>
                <UButton
                  color="primary"
                  variant="link"
                  size="sm"
                  :icon="passwordVisibility ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="passwordVisibility ? 'Hide password' : 'Show password'"
                  :aria-pressed="passwordVisibility"
                  aria-controls="password"
                  @click="passwordVisibility = !passwordVisibility"
                  class="cursor-pointer"
                />
              </template>
            </UInput>
          </UFormField>

          <UButton
            type="submit"
            block
            color="primary"
            size="lg"
            label="Login"
            class="drop-shadow-xl cursor-pointer hover:opacity-90 transition-opacity"
          />
        </UForm>
      </div>
    </div>

    <img src="../assets/Ellipse.svg" class="absolute left-50 top-50 dark:opacity-60" />
    <img src="../assets/Ellipse.svg" class="absolute right-50 top-70 dark:opacity-60" />

    <img src="../assets/line.svg" class="absolute right-0 top-20 dark:opacity-70" />
    <img src="../assets/line.svg" class="absolute left-0 bottom-20 dark:opacity-70" />

    <!-- Add dark mode toggle in corner -->
    <div class="absolute top-4 right-4">
      <ColorModeSwitch />
    </div>
  </div>
</template>
