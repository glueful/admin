<script setup lang="ts">
import { computed } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useColorMode } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const authStore = useAuthStore()
const router = useRouter()

// Get user data from auth store instead of hardcoding
const user = computed(() => {
  const fullName = authStore.user
    ? `${authStore.user.firstName || ''} ${authStore.user.lastName || ''}`.trim()
    : 'Super User'

  return {
    name: fullName,
    avatar: {
      src: '', // You might want to add an avatar URL based on user email for services like Gravatar
      alt: fullName[0],
    },
  }
})

// Handle logout function
const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: user.value.name,
      avatar: user.value.avatar,
      description: authStore.user?.email || '',
    },
  ],
  [
    {
      label: 'Settings',
      icon: 'i-lucide-settings',
      to: '/settings',
    },
  ],
  [
    {
      label: 'Appearance',
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: 'Light',
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onSelect(e: Event) {
            e.preventDefault()
            colorMode.value = 'light'
          },
        },
        {
          label: 'Dark',
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
      ],
    },
  ],
  [
    {
      label: 'Documentation',
      icon: 'i-lucide-book-open',
      to: 'http://localhost/glueful/docs/',
      target: '_blank',
    },
  ],
  [
    {
      label: 'Log out',
      icon: 'i-lucide-log-out',
      onClick: handleLogout,
    },
  ],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : user?.name,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-(--ui-bg-elevated) rounded-full"
      :ui="{
        trailingIcon: 'text-(--ui-text-dimmed)',
      }"
    />

    <template #chip-leading="{ item }">
      <span
        :style="{ '--chip': `var(--color-${(item as any).chip}-400)` }"
        class="ms-0.5 size-2 rounded-full bg-(--chip)"
      />
    </template>
  </UDropdownMenu>
</template>
