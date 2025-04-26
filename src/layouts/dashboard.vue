<script setup lang="ts">
import { dashboardMenus } from '@/constants/dashboard_menus'
import { ref } from 'vue'
const menus = dashboardMenus
// Set collapsed to true by default to have the sidebar collapsed
const collapsed = ref(true)
const open = ref(true) // Set open to true by default on desktop
</script>
<template>
  <DashboardGroup storage="local">
    <DashboardSidebar
      collapsible
      v-model:collapsed="collapsed"
      v-model:open="open"
      :ui="{
        root: 'bg-white dark:bg-[#1f1c1d]',
        footer: 'py-3',
        header: 'px-3 pt-3 pb-2',
        body: 'px-3',
      }"
    >
      <template #header>
        <div class="logo mb-2"></div>
      </template>
      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="menus"
          variant="pill"
          orientation="vertical"
          :ui="{
            item: 'my-2',
            icon: 'text-[var(--brand-medium)] dark:text-[var(--brand-light)]',
            active: 'before:bg-[var(--brand-dark)] dark:before:bg-[var(--brand-light)]',
          }"
        />
      </template>
      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </DashboardSidebar>
    <RouterView />
  </DashboardGroup>
</template>
