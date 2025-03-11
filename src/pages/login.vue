<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { reactive } from 'vue'

const state = reactive({
  email: undefined,
  password: undefined,
})

const validate = (state: any): FormError[] => {
  const errors = []
  if (!state.email) errors.push({ name: 'username', message: 'Enter an email or username ' })
  if (!state.password) errors.push({ name: 'password', message: 'Enter your password' })
  return errors
}

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<any>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}
</script>

<template>
  <div
    class="flex items-center justify-center min-h-screen relative overflow-hidden bg-(--loginPageBg)"
  >
    <div class="absolute inset-0 flex items-center justify-center">
      <img
        src="../assets/bg_shape.svg"
        class="absolute transform -translate-x-55 translate-y-10 w-[600px]"
      />
    </div>
    <div class="absolute inset-0 flex items-center justify-center">
      <img src="../assets/form_bg.svg" />
    </div>

    <!-- Centered Transparent Container with White SVG Background -->
    <div class="relative z-10 bg-transparent p-0 rounded-2xl w-96 mb-10">
      <div class="mb-5">
        <img src="../assets/logo_full.svg" width="150" class="mb-5" />
        <img src="../assets/line.svg" class="-ml-15" />
      </div>
      <div class="flex flex-col">
        <UForm :validate="validate" :state="state" @submit="onSubmit" class="space-y-5">
          <UFormField label="Username" name="username" size="lg">
            <UInput v-model="state.email" class="w-full" />
          </UFormField>

          <UFormField label="Password" name="password" size="lg">
            <UInput v-model="state.password" type="password" class="w-full" />
          </UFormField>

          <UButton
            type="submit"
            block
            color="neutral"
            size="lg"
            label="Login"
            class="drop-shadow-xl"
          />
        </UForm>
      </div>
    </div>

    <img src="../assets/Ellipse.svg" class="absolute left-50 top-50" />
    <img src="../assets/Ellipse.svg" class="absolute right-50 top-70" />

    <img src="../assets/line.svg" class="absolute right-0 top-20" />
    <img src="../assets/line.svg" class="absolute left-0 bottom-20" />
  </div>
</template>
