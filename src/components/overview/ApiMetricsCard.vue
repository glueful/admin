<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useApiMetricsStore } from '@/stores/apiMetricsStore'
import UseChart from '@/components/UseChart.vue'
import type { TableColumn } from '@nuxt/ui'

const store = useApiMetricsStore()

// Computed properties from the store
const loading = computed(() => store.isLoading)
const error = computed(() => store.error)
const totalEndpoints = computed(() => store.totalEndpoints)
const totalRequests = computed(() => store.totalRequests)
const avgResponseTime = computed(() => store.avgResponseTime)
const errorRate = computed(() => store.errorRate)
const lastRefreshed = computed(() => store.lastRefreshed)
const topEndpoints = computed(() => store.getTopEndpoints)
const problematicEndpoints = computed(() => store.getProblematicEndpoints)
const rateLimitsNearing = computed(() => store.getRateLimitsNearingThreshold)
// const categories = computed(() => store.categories)
const categoryDistribution = computed(() => store.categoryDistribution)

// Tab management
const tabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: 'i-lucide-layout-dashboard',
    slot: 'overview' as const,
  },
  { id: 'endpoints', label: 'Endpoints', icon: 'i-lucide-globe', slot: 'endpoints' as const },
  { id: 'errors', label: 'Errors', icon: 'i-lucide-alert-triangle', slot: 'errors' as const },
  { id: 'rate-limits', label: 'Rate Limits', icon: 'i-lucide-gauge', slot: 'rate-limits' as const },
]

// Format milliseconds to readable time
function formatResponseTime(ms: number): string {
  return ms < 1000 ? `${ms.toFixed(2)} ms` : `${(ms / 1000).toFixed(2)} s`
}

// Format large numbers with thousand separators
function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num)
}

// Format percentage values
function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`
}

// Generate request volume chart data
const requestVolumeChartOptions: any = computed(() => {
  if (!store.requestsOverTime.length) return {}

  const labels = store.requestsOverTime.map((item) => item.date)
  const data = store.requestsOverTime.map((item) => item.count)

  return {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Request Volume',
          data,
          fill: true,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  }
})

// Generate category distribution chart data
const categoryChartOptions: any = computed(() => {
  if (!store.categoryDistribution.length) return {}

  const labels = store.categoryDistribution.map((item) => item.category)
  const data = store.categoryDistribution.map((item) => item.count)
  const backgroundColors = [
    'rgba(59, 130, 246, 0.7)', // blue
    'rgba(16, 185, 129, 0.7)', // green
    'rgba(249, 115, 22, 0.7)', // orange
    'rgba(139, 92, 246, 0.7)', // purple
    'rgba(236, 72, 153, 0.7)', // pink
    'rgba(107, 114, 128, 0.7)', // gray
  ]

  return {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
      cutout: '65%',
    },
  }
})

// Fetch data when component mounts
async function refresh() {
  await store.fetchApiMetrics()
}

onMounted(async () => {
  await refresh()
})

//columns
const endPointsColumns = computed<TableColumn<any>[]>(() => {
  return [
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
    },
    {
      accessorKey: 'method',
      header: 'Method',
    },
    {
      accessorKey: 'calls',
      header: 'Requests',
    },
    {
      accessorKey: 'avgResponseTime',
      header: 'Avg Response',
    },
    {
      accessorKey: 'errorRate',
      header: 'Error Rate',
    },
    {
      accessorKey: 'lastCalled',
      header: 'Last Called',
    },
  ]
})

const errorColumns = computed<TableColumn<any>[]>(() => {
  return [
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
    },
    {
      accessorKey: 'method',
      header: 'Method',
    },
    {
      accessorKey: 'calls',
      header: 'Requests',
    },
    {
      accessorKey: 'errorRate',
      header: 'Error Rate',
    },
  ]
})

const rateLimitColumns = computed<TableColumn<any>[]>(() => {
  return [
    {
      accessorKey: 'ip',
      header: 'IP Address',
    },
    {
      accessorKey: 'endpoint',
      header: 'Endpoint',
    },
    {
      accessorKey: 'usagePercentage',
      header: 'Usage',
    },
    {
      accessorKey: 'remaining',
      header: 'Remaining Requests',
    },
    {
      accessorKey: 'reset',
      header: 'Resets In',
    },
  ]
})
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold flex items-center">
          <UIcon name="i-lucide-activity" class="mr-2" />
          API Status & Metrics
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
      <!-- Tabs -->
      <UTabs :items="tabs" variant="link">
        <!-- Columns Tab -->
        <template #overview>
          <div class="pt-4">
            <!-- API Summary Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-3xl font-bold text-primary-500">
                  {{ formatNumber(totalEndpoints) }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Endpoints</div>
              </div>

              <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-3xl font-bold text-primary-500">
                  {{ formatNumber(totalRequests) }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Total Requests</div>
              </div>

              <div class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div class="text-3xl font-bold text-primary-500">
                  {{ formatResponseTime(avgResponseTime) }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Avg Response Time</div>
              </div>

              <div
                class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                :class="{ 'bg-red-50 dark:bg-red-900/20': errorRate > 5 }"
              >
                <div
                  class="text-3xl font-bold"
                  :class="errorRate > 5 ? 'text-red-500' : 'text-primary-500'"
                >
                  {{ formatPercentage(errorRate) }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Error Rate</div>
              </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <!-- Request Volume Chart -->
              <div>
                <h3 class="text-md font-semibold mb-2">Request Volume (Last 7 Days)</h3>
                <div class="h-64 border rounded-md p-2 bg-white dark:bg-gray-800">
                  <template v-if="store.requestsOverTime.length">
                    <UseChart :options="requestVolumeChartOptions" />
                  </template>
                  <div v-else class="flex items-center justify-center h-full text-gray-400">
                    No data available
                  </div>
                </div>
              </div>

              <!-- Category Distribution -->
              <div>
                <h3 class="text-md font-semibold mb-2">Endpoints by Category</h3>
                <div class="h-64 border rounded-md p-2 bg-white dark:bg-gray-800">
                  <template v-if="categoryDistribution.length">
                    <UseChart :options="categoryChartOptions" />
                  </template>
                  <div v-else class="flex items-center justify-center h-full text-gray-400">
                    No category data available
                  </div>
                </div>
              </div>
            </div>

            <!-- Link to API Explorer -->
            <div class="mt-4 flex justify-end">
              <UButton
                variant="outline"
                to="/api-explorer"
                size="sm"
                icon="i-lucide-external-link"
                class="text-sm"
              >
                Open API Explorer
              </UButton>
            </div>
          </div>
        </template>

        <!-- Endpoints Tab -->
        <template #endpoints>
          <div class="pt-4">
            <h3 class="text-md font-semibold mb-2">Top 5 Most Active Endpoints</h3>
            <UTable :columns="endPointsColumns" :data="topEndpoints" class="h-96">
              <template #method-cell="{ row }: { row: any }">
                <UBadge
                  :color="
                    row.original.method === 'GET'
                      ? 'success'
                      : row.original.method === 'POST'
                        ? 'info'
                        : 'warning'
                  "
                  size="sm"
                >
                  {{ row.original.method }}
                </UBadge>
              </template>
              <template #calls-cell="{ row }: { row: any }">
                {{ formatNumber(row.original.calls) }}
              </template>
              <template #avgResponseTime-cell="{ row }: { row: any }">
                {{ formatResponseTime(row.original.avgResponseTime) }}
              </template>
              <template #errorRate-cell="{ row }: { row: any }">
                <span :class="row.original.errorRate > 5 ? 'text-red-500' : ''">
                  {{ formatPercentage(row.original.errorRate) }}
                </span>
              </template>
              <template #empty>
                <div class="text-center py-8 text-green-500 font-semibold">
                  <UIcon name="i-heroicons-check-circle" class="w-8 h-8 mx-auto mb-2" />
                  No endpoint data available
                </div>
              </template>
            </UTable>
          </div>
        </template>

        <!-- Errors Tab -->
        <template #errors>
          <div class="pt-4">
            <h3 class="text-md font-semibold mb-2">Problematic Endpoints (Error Rate > 5%)</h3>

            <UTable :columns="errorColumns" :data="problematicEndpoints">
              <template #method-cell="{ row }: { row: any }">
                <UBadge
                  :color="
                    row.original.method === 'GET'
                      ? 'success'
                      : row.original.method === 'POST'
                        ? 'info'
                        : 'warning'
                  "
                  size="sm"
                >
                  {{ row.original.method }}
                </UBadge>
              </template>
              <template #calls-cell="{ row }: { row: any }">
                {{ formatNumber(row.calls) }}
              </template>
              <template #errorRate-cell="{ row }: { row: any }">
                <span :class="row.original.errorRate > 5 ? 'text-red-500' : ''">
                  {{ formatPercentage(row.original.errorRate) }}
                </span>
              </template>
              <template #empty>
                <div class="text-center py-8 text-green-500 font-semibold">
                  <UIcon name="i-heroicons-check-circle" class="w-8 h-8 mx-auto mb-2" />
                  No problematic endpoints detected
                </div>
              </template>
            </UTable>
          </div>
        </template>

        <!-- Rate Limits Tab -->
        <template #rate-limits>
          <div class="pt-4">
            <h3 class="text-md font-semibold mb-2">
              Rate Limits Approaching Threshold (>80% Usage)
            </h3>
            <UTable
              :columns="rateLimitColumns"
              :rows="rateLimitsNearing"
              :sort="{ column: 'usagePercentage', direction: 'desc' }"
            >
              <template #usagePercentage-cell="{ row }: { row: any }">
                <div class="w-full">
                  <UProgress
                    :value="row.original.usagePercentage"
                    :color="row.original.usagePercentage > 90 ? 'red' : 'orange'"
                    size="xs"
                  />
                  <div class="text-xs mt-1">
                    {{ formatPercentage(row.original.usagePercentage) }}
                  </div>
                </div>
              </template>
              <template #reset-cell="{ row }: { row: any }">
                {{ Math.round(row.original.reset / 60) }} min
              </template>
              <template #empty>
                <div class="text-center py-8 text-green-500 font-semibold">
                  <UIcon name="i-heroicons-check-circle" class="w-8 h-8 mx-auto mb-2" />
                  No rate limits approaching threshold
                </div>
              </template>
            </UTable>
          </div>
        </template>
      </UTabs>
    </div>

    <!-- Footer with last refreshed time -->
    <template #footer>
      <div class="text-xs text-gray-500 flex justify-between items-center">
        <span>Last updated: {{ lastRefreshed }}</span>

        <UButton
          variant="link"
          size="xs"
          @click="store.resetApiMetricsStats()"
          :disabled="loading"
          class="text-xs"
        >
          Reset Statistics
        </UButton>
      </div>
    </template>
  </UCard>
</template>
