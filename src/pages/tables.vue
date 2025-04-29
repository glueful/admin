<script lang="ts" setup>
import { useDBTablesStore } from '@/stores/dbTables'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

// Define the TableData interface
interface TableColumn {
  name: string
  type: string
  length: string | null
  nullable: boolean
  primary: boolean
}

interface TableData {
  name: string
  columns: TableColumn[]
}

// Get the DB tables store
const dbTablesStore = useDBTablesStore()
const isLoading = ref(true)
const showNewTableSlideover = ref(false)
const router = useRouter()

// Load tables when component is mounted
onMounted(async () => {
  isLoading.value = true
  await dbTablesStore.fetchTables()
  isLoading.value = false
  // Only navigate to the first table if we're on the exact /tables route
  // and not already on a specific table page like /tables/some_table
  if (dbTablesStore.tables.length > 0 && router.currentRoute.value.path === '/tables') {
    router.push(`/tables/${dbTablesStore.tables[0]}`)
  }
})

// Handle new table creation
const handleCreateTable = async (tableData: TableData) => {
  try {
    // Here you would call your API to create the table
    // For now, we'll just log the data
    console.log('Creating table:', tableData)

    // After successful creation, refresh the tables list
    await dbTablesStore.fetchTables()

    // Navigate to the newly created table
    // Type assertion to fix the includes method error
    if ((dbTablesStore.tables as string[]).includes(tableData.name)) {
      router.push(`/tables/${tableData.name}`)
    }
  } catch (error) {
    console.error('Error creating table:', error)
  }
}
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
        <UButton
          size="sm"
          color="primary"
          icon="i-lucide-plus"
          @click="showNewTableSlideover = true"
        ></UButton>
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

  <!-- New Table Slideover -->
  <TableSlideover
    v-model:open="showNewTableSlideover"
    slideoverTitle="Create New Table"
    @submit="handleCreateTable"
    @close="showNewTableSlideover = false"
  />
</template>
<route lang="json">
{
  "meta": {
    "layout": "dashboard",
    "requiresAuth": true
  }
}
</route>
