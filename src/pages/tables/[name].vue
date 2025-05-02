<script lang="ts" setup>
import { useToastNotification } from '@/composables/useToastNotification'
import { useDBTablesStore } from '@/stores/dbTables'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route: any = useRoute()
const router = useRouter()
const tableStore = useDBTablesStore()
const tableName = ref(route.params.name as string)
const isLoading = ref(false)
const toast = useToastNotification()
const showDeleteConfirm = ref(false)
const isDeletingTable = ref(false)

// Fetch table data when the component is mounted
const fetchTableData = async () => {
  isLoading.value = true
  tableStore.tableData = []
  tableStore.tableColumns = []
  await tableStore.fetchTableData(tableName.value)
  isLoading.value = false
}

// Function to handle table deletion
const handleDeleteTable = async () => {
  isDeletingTable.value = true
  try {
    await tableStore.deleteTable(tableName.value)
    toast.success({
      title: 'Table deleted',
      description: `Table "${tableName.value}" has been deleted successfully.`,
    })
    // Redirect back to the tables list
    router.push('/tables')
  } catch (error: any) {
    toast.error({
      title: 'Delete failed',
      description: error.message || `Failed to delete table "${tableName.value}".`,
    })
    console.error('Error deleting table:', error)
  } finally {
    isDeletingTable.value = false
    showDeleteConfirm.value = false
  }
}

watch(
  () => route.params.name,
  async (newName) => {
    tableName.value = newName as string
    if (tableName.value) {
      await fetchTableData()
    }
  },
  { immediate: true },
)

// Handle refresh data event from the table component
const handleRefresh = async (schema: any) => {
  console.log('Refresh data:', schema)
  if (schema.data.failed_operations.length) {
    toast.error({
      title: schema.message,
      description: schema.data.failed_operations.map((operation: any) => operation).join(', '),
    })
  }
  if (schema.success) {
    toast.success({
      title: 'Schema updated successfully',
      description: schema.message,
    })
  }
  await fetchTableData()
}
</script>

<template>
  <div class="h-full flex flex-col">
    <DashboardNavbar :title="`${tableName}`" v-if="tableName">
      <template #right>
        <UButton
          color="error"
          variant="outline"
          icon="i-tabler-trash"
          size="sm"
          @click="showDeleteConfirm = true"
        />
        <UButton size="sm" color="primary" icon="i-lucide-plus"> New Record </UButton>
      </template>
    </DashboardNavbar>

    <div class="flex-1 p-4 overflow-auto">
      <DbTable
        :table-data="tableStore.tableData"
        :columns="tableStore.tableColumns"
        :is-loading="isLoading"
        :total-items="tableStore.pagination.total"
        v-if="tableStore.tableData.length > 0 || tableStore.tableColumns.length > 0"
        :table-name="tableName"
        @refresh-data="handleRefresh"
      >
        <template #empty>
          <div class="flex flex-col items-center justify-center py-12 text-center">
            <div class="mb-4 text-gray-400">
              <UIcon name="i-lucide-database" class="w-12 h-12" />
            </div>
            <h3 class="text-base font-semibold mb-1">No data available</h3>
            <p class="text-sm text-gray-500 mb-4">This table doesn't have any records yet.</p>
            <UButton size="sm" color="primary" icon="i-lucide-plus"> Add First Record </UButton>
          </div>
        </template>
      </DbTable>
    </div>

    <!-- Confirmation Modal for Table Deletion -->
    <ConfirmModal
      v-model:open="showDeleteConfirm"
      ModalIcon="i-tabler-trash"
      :ModalContent="`Are you sure you want to delete the table <b>'${tableName}'</b>? All data will be permanently deleted. This action cannot be undone.`"
      ModalConfirmText="Yes, Delete Table"
      ModalCancelText="Cancel"
      :is-loading="isDeletingTable"
      @confirm="handleDeleteTable"
      @close="showDeleteConfirm = false"
      ModalIconClass="text-red-500 size-15 color-red-500"
      :ui="{ content: 'divide-y-0 p-5', footer: 'flex justify-end space-x-2' }"
      ModalConfirmColor="error"
    />
  </div>
</template>
