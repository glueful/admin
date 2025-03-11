<script setup lang="ts">
import { ref } from 'vue'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar.vue'
import DashboardGroup from '@/components/dashboard/DashboardGroup.vue'
import UserMenu from '@/components/UserMenu.vue'

const collapsed = ref(true)
const open = ref(false)

const menus = ref([
  {
    label: 'Home',
    icon: 'i-lucide-house',
    to: '/admin/home',
  },
  {
    label: 'Tables',
    icon: 'i-lucide-table',
    to: '/admin/tables',
  },
  {
    label: 'Migrations',
    icon: 'i-lucide-folder-symlink',
    to: '/admin/migrations',
  },
  {
    label: 'Commads',
    icon: 'i-lucide-square-terminal',
    to: '/admin/commands',
  },
  {
    label: 'Extensions',
    icon: 'i-lucide-package',
    to: '/admin/extensions',
  },
  {
    label: 'Cron Jobs',
    icon: 'i-lucide-timer-reset',
    to: '/admin/cron-jobs',
  },
  {
    label: 'Logs',
    icon: 'i-lucide-square-activity',
    to: '/admin/logs',
  },
  {
    label: 'Permissions',
    icon: 'i-lucide-shield-check',
    to: '/admin/permissions',
    iconSize: 'size-6',
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: '/admin/settings',
  },
])
</script>
<template>
  <DashboardGroup storage="local">
    <DashboardSidebar
      collapsible
      v-model:collapsed="collapsed"
      v-model:open="open"
      :ui="{ footer: 'lg:border-t lg:border-(--ui-border)', header: 'px-3 pt-2' }"
    >
      <template #header>
        <div class="logo">
          <!-- <img src="../assets/logo.svg" alt="Glueful" class="w-30" /> -->
        </div>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="menus"
          variant="pill"
          orientation="vertical"
          :ui="{ item: 'my-4' }"
        />
      </template>
      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </DashboardSidebar>
    <RouterView />
  </DashboardGroup>
</template>
