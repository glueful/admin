<script setup lang="ts">
import { computed, onMounted, ref, h } from 'vue'
import { useDashboardOverviewStore } from '@/stores/dashboardOverview'
import type { TableColumn } from '@nuxt/ui'

const store = useDashboardOverviewStore()

const loading = computed(() => store.dbStats.loading)
const error = computed(() => store.dbStats.error)
const largestTables = computed(() => store.dbStats.largestTables)
const allTables = computed(() => store.dbStats.allTables || [])

// New computed properties for summary statistics
const totalTables = computed(() => store.dbStats.totalTables || 0)
const totalDatabaseSize = computed(() => {
  return allTables.value.reduce((sum: any, table: any) => sum + (table.size || 0), 0)
})
const totalRows = computed(() => {
  return allTables.value.reduce((sum: any, table: any) => sum + (table.rows || 0), 0)
})
const avgRowsPerTable = computed(() => {
  if (!totalTables.value) return 0
  return Math.round(totalRows.value / totalTables.value)
})

// For search and filtering
const searchQuery = ref('')
const filteredTables = computed(() => {
  if (!searchQuery.value.trim()) return largestTables.value

  const query = searchQuery.value.toLowerCase()
  return largestTables.value.filter(
    (table: any) =>
      table.table_name.toLowerCase().includes(query) ||
      (table.schema && table.schema.toLowerCase().includes(query)),
  )
})

// For table sorting
const sortColumn = ref('size')
const sortDirection = ref('desc')

function toggleSort(column: any) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

const sortedTables = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1

  return [...filteredTables.value].sort((a, b) => {
    const valueA = a[sortColumn.value]
    const valueB = b[sortColumn.value]

    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return direction * valueA.localeCompare(valueB)
    }

    // Handle numeric comparison
    return direction * (valueA - valueB)
  })
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

// Calculate the percentage of total DB size for visual indicators
function calculateSizePercentage(size: number): number {
  if (!totalDatabaseSize.value) return 0
  return (size / totalDatabaseSize.value) * 100
}

// Determine color based on table size percentage
function getSizeIndicatorColor(percentage: number): string {
  if (percentage > 30) return 'bg-red-500 dark:bg-red-400'
  if (percentage > 15) return 'bg-amber-500 dark:bg-amber-400'
  if (percentage > 5) return 'bg-blue-500 dark:bg-blue-400'
  return 'bg-green-500 dark:bg-green-400'
}

async function refresh() {
  await store.fetchDbStats()
}

onMounted(async () => {
  await refresh()
})

const columns = computed<TableColumn<any>[]>(() => {
  if (!largestTables.value?.length) return []

  // Add some custom columns for better visualization
  return [
    {
      accessorKey: 'table_name',
      header: 'Table',
      sortable: true,
      cell: ({ row }: any) => {
        const value = row.getValue('table_name')
        return value
      },
    },
    {
      accessorKey: 'schema',
      header: 'Schema',
      sortable: true,
    },
    {
      accessorKey: 'size',
      header: 'Size',
      sortable: true,
      cell: ({ row }: any) => {
        const value = row.getValue('size')
        const percentage = calculateSizePercentage(value)
        const color = getSizeIndicatorColor(percentage)

        return h('div', { class: 'flex items-center' }, [
          h('div', { class: 'mr-2' }, formatBytes(value)),
          h('div', { class: 'w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden' }, [
            h('div', {
              class: `h-full ${color}`,
              style: `width: ${Math.min(percentage, 100)}%`,
            }),
          ]),
        ])
      },
    },
    {
      accessorKey: 'rows',
      header: 'Rows',
      sortable: true,
      cell: ({ row }: any) => {
        const value = row.getValue('rows')
        return formatNumber(value)
      },
    },
    {
      accessorKey: 'avg_row_size',
      header: 'Avg Row Size',
      sortable: true,
      cell: ({ row }: any) => {
        const value = row.getValue('avg_row_size')
        return formatBytes(value)
      },
    },
  ]
})
</script>
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold flex items-center">
          <UIcon name="i-lucide-database" class="mr-2" />
          Database Overview
        </h2>
        <UButton
          variant="ghost"
          icon="i-heroicons-arrow-path"
          :loading="loading"
          @click="refresh"
          size="sm"
        />
      </div>
    </template>

    <div v-if="loading" class="py-8">
      <UProgress indeterminate />
    </div>

    <div v-else-if="error" class="p-4 text-red-600 dark:text-red-400">
      <UIcon name="i-heroicons-exclamation-triangle" class="mr-2" />
      <span>{{ error }}</span>
    </div>

    <div v-else>
      <!-- Database Summary Statistics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-3xl font-bold text-primary-500">{{ totalTables }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Total Tables</div>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-3xl font-bold text-primary-500">
            {{ formatBytes(totalDatabaseSize) }}
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Total Size</div>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-3xl font-bold text-primary-500">{{ formatNumber(totalRows) }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Total Rows</div>
        </div>

        <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div class="text-3xl font-bold text-primary-500">{{ formatNumber(avgRowsPerTable) }}</div>
          <div class="text-sm text-gray-500 dark:text-gray-400">Avg Rows/Table</div>
        </div>
      </div>

      <!-- Largest Tables Section -->
      <div v-if="largestTables?.length" class="mb-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between mb-4">
          <h3 class="text-md font-semibold">Largest Tables</h3>

          <!-- Search input -->
          <div class="mt-2 md:mt-0 w-full md:w-64">
            <UInput
              v-model="searchQuery"
              placeholder="Search tables..."
              icon="i-heroicons-magnifying-glass"
              size="sm"
              class="w-full"
            />
          </div>
        </div>

        <!-- Table legend -->
        <div class="flex flex-wrap items-center space-x-4 mb-2 text-sm text-gray-500">
          <span>Size indicators:</span>
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
            <span>&lt; 5%</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
            <span>5-15%</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full bg-amber-500 mr-1"></div>
            <span>15-30%</span>
          </div>
          <div class="flex items-center">
            <div class="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
            <span>&gt; 30%</span>
          </div>
        </div>

        <!-- Table with enhanced interactivity -->
        <UTable
          :columns="columns"
          :data="sortedTables"
          :sort="{ column: sortColumn, direction: sortDirection }"
          @sort="toggleSort"
          sticky
          class="h-80"
        />
      </div>

      <div v-else class="text-center py-8 text-gray-500">No table information available</div>
    </div>
  </UCard>
</template>
