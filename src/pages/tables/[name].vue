<script lang="ts" setup>
import { useDBTablesStore } from '@/stores/dbTables'
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route: any = useRoute()
const tableStore = useDBTablesStore()
const tableName = ref(route.params.name as string)
const isLoading = ref(false)

watch(
  () => route.params.name,
  async (newName) => {
    tableName.value = newName as string
    if (tableName.value) {
      isLoading.value = true
      tableStore.tableData = []
      tableStore.tableColumns = []
      await tableStore.fetchTableData(tableName.value)
      isLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="h-full flex flex-col">
    <DashboardNavbar :title="`${tableName}`" v-if="tableName">
      <template #right>
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
  </div>
</template>
