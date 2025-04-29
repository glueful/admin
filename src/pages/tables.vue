<script lang="ts" setup>
import router from '@/router'
import { useDBTablesStore } from '@/stores/dbTables'
import { onMounted, ref } from 'vue'

// Get the DB tables store
const dbTablesStore = useDBTablesStore()
const isLoading = ref(true)

// Load tables when component is mounted
onMounted(async () => {
  isLoading.value = true
  await dbTablesStore.fetchTables()
  isLoading.value = false
  router.push(`/tables/${dbTablesStore.tables[0]}`)
})
</script>
<template>
  <DashboardPanel id="tables-list" :default-size="15" :min-size="15" :max-size="25">
    <DashboardNavbar title="Tables">
      <template #left>
        <div class="flex items-center">
          <span>Tables</span>
        </div>
      </template>
      <template #right>
        <UButton size="sm" color="primary" icon="i-lucide-plus"></UButton>
      </template>
    </DashboardNavbar>
    <div class="overflow-y-auto">
      <!-- Loading state -->
      <div v-if="isLoading" class="p-4 text-center">
        <span class="animate-pulse">Loading tables...</span>
      </div>

      <!-- Error state -->
      <div v-else-if="dbTablesStore.dbError" class="p-4 text-red-500">
        {{ dbTablesStore.dbError }}
      </div>

      <!-- Empty state -->
      <div v-else-if="!dbTablesStore.tables.length" class="p-4 text-center text-gray-500">
        No tables found
      </div>

      <!-- Tables list -->
      <template v-else>
        <ULink
          v-for="tableName in dbTablesStore.tables"
          :key="tableName"
          :to="`/tables/${tableName}`"
          class="block px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 text-base"
          active-class="bg-primary-50 dark:bg-primary-900 font-medium"
          inactive-class="text-gray-700 dark:text-gray-300"
        >
          <div class="flex items-center">
            <UIcon name="i-lucide-table-2" class="mr-2 flex-shrink-0" />
            <div class="flex-1">
              {{ tableName }}
            </div>
          </div>
        </ULink>
      </template>
    </div>
  </DashboardPanel>
  <DashboardPanel id="table-details">
    <RouterView />
  </DashboardPanel>
</template>
<route lang="json">
{
  "meta": {
    "layout": "dashboard",
    "requiresAuth": true
  }
}
</route>
