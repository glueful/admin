<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDashboardOverviewStore } from '@/stores/dashboardOverview'

const store = useDashboardOverviewStore()

const loading = computed(() => store.systemHealth.loading)
const error = computed(() => store.systemHealth.error)
const uptime = computed(() => store.systemHealth.uptime)
const phpVersion = computed(() => store.systemHealth.phpVersion)
const lastUpdated = computed(() => store.lastRefreshed)

// New computed properties based on updated store structure
const fileSystem = computed(() => store.systemHealth.fileSystem || {})
const memory = computed(() => store.systemHealth.memoryUsage || {})
const database = computed(() => store.systemHealth.database || {})
const cache = computed(() => store.systemHealth.cache || {})
const serverLoad = computed(() => store.systemHealth.serverLoad || {})
const extensions = computed(() => store.systemHealth.extensions || {})
const recentLogs = computed(() => store.systemHealth.recentLogs || [])
const time = computed(() => store.systemHealth.time || {})

// Calculate disk usage percentage from the string (e.g., "92.07%")
const diskUsage = computed(() => {
  const usageStr = fileSystem.value.usagePercent || '0%'
  return parseFloat(usageStr.replace('%', ''))
})

// Helper to format memory sizes for display
function formatMemory(memoryStr: string): string {
  return memoryStr || '0 B'
}

// Calculate memory usage for display
// Since we don't have a percentage, we'll display the actual values
const memoryCurrentUsage = computed(() => formatMemory(memory.value.current))
const memoryPeakUsage = computed(() => formatMemory(memory.value.peak))

// Server load average for 1, 5, and 15 minutes
const loadAvg = computed(() => {
  return {
    '1min': serverLoad.value['1min'] || 0,
    '5min': serverLoad.value['5min'] || 0,
    '15min': serverLoad.value['15min'] || 0,
  }
})

// Calculate server load percentage for visual display (simplified approach)
const cpuUsage = computed(() => {
  // Convert load average to a percentage by assuming a reasonable threshold
  // This is a simplified approach - a load of 1.0 per core is considered 100% in Unix systems
  const loadValue = loadAvg.value['1min']
  // Assume 4 cores as a reasonable default, so 4.0 would be 100%
  const percentLoad = Math.min(100, (loadValue / 4) * 100)
  return Math.round(percentLoad)
})

function getStatusIcon(status: string): string {
  if (
    status === 'online' ||
    status === 'connected' ||
    status === 'operational' ||
    status === 'enabled'
  )
    return 'i-heroicons-check-circle'
  if (status === 'warning' || status === 'degraded') return 'i-heroicons-exclamation-triangle'
  return 'i-heroicons-exclamation-circle'
}

function getStatusColor(status: string): string {
  if (
    status === 'online' ||
    status === 'connected' ||
    status === 'operational' ||
    status === 'enabled'
  )
    return 'text-green-500'
  if (status === 'warning' || status === 'degraded') return 'text-amber-500'
  return 'text-red-500'
}

function getHealthColor(value: number): string {
  if (value < 70) return 'green'
  if (value < 90) return 'yellow'
  return 'red'
}

function getOverallStatusClasses() {
  const status = getOverallStatus()
  if (status.class === 'healthy') return 'text-green-500'
  if (status.class === 'warning') return 'text-amber-500'
  return 'text-red-500'
}

function getOverallStatus() {
  // Calculate overall status based on multiple factors
  // Check disk usage, database status, and server load
  const factors = []

  if (diskUsage.value > 80) factors.push('high-disk')
  if (database.value.status !== 'connected') factors.push('database-issue')
  if (cpuUsage.value > 80) factors.push('high-load')

  if (factors.length === 0) {
    return {
      class: 'healthy',
      text: 'System operating normally',
      icon: 'i-heroicons-check-circle',
    }
  } else if (factors.length === 1 || cpuUsage.value < 90) {
    return {
      class: 'warning',
      text: 'System under moderate load',
      icon: 'i-heroicons-exclamation-triangle',
    }
  } else {
    return {
      class: 'critical',
      text: 'System experiencing high load',
      icon: 'i-heroicons-exclamation-circle',
    }
  }
}

async function refresh() {
  await store.fetchSystemHealth()
}

onMounted(async () => {
  await refresh()
})
</script>
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold flex items-center">
          <UIcon name="i-heroicons-heart" class="mr-2" />
          System Health
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

    <div v-if="loading" class="py-8"></div>

    <div v-else-if="error" class="p-4 text-red-600 dark:text-red-400">
      <UIcon name="i-heroicons-exclamation-triangle" class="mr-2" />
      <span>{{ error }}</span>
    </div>

    <div v-else>
      <!-- Resource Usage Metrics -->
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center">
        <UIcon name="i-heroicons-chart-bar" class="mr-1" />
        Resource Usage
      </h3>

      <div class="space-y-4 mb-6">
        <!-- Disk Usage -->
        <div class="metric-item">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-server" class="text-gray-400" />
              <span class="font-medium">Disk Usage</span>
            </div>
            <div class="text-xs text-gray-500">
              {{ fileSystem.freeSpace }} free of {{ fileSystem.totalSpace }}
            </div>
          </div>
          <UProgress :value="diskUsage" :color="getHealthColor(diskUsage)" size="sm" />
          <div class="text-right text-xs text-gray-500">{{ fileSystem.usagePercent }}</div>
        </div>

        <!-- Memory Usage -->
        <div class="metric-item">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-cpu-chip" class="text-gray-400" />
              <span class="font-medium">Memory Usage</span>
            </div>
          </div>
          <div class="flex justify-between text-sm mt-1">
            <span>Current: {{ memoryCurrentUsage }}</span>
            <span>Peak: {{ memoryPeakUsage }}</span>
          </div>
        </div>

        <!-- Server Load -->
        <div class="metric-item">
          <div class="flex items-center justify-between mb-1">
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-variable" class="text-gray-400" />
              <span class="font-medium">Server Load</span>
            </div>
          </div>
          <UProgress :value="cpuUsage" :color="getHealthColor(cpuUsage)" size="sm" />
          <div class="flex justify-between text-xs text-gray-500 mt-1">
            <span>1m: {{ loadAvg['1min'].toFixed(2) }}</span>
            <span>5m: {{ loadAvg['5min'].toFixed(2) }}</span>
            <span>15m: {{ loadAvg['15min'].toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <!-- System Status Metrics -->
      <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center">
        <UIcon name="i-heroicons-server-stack" class="mr-1" />
        System Status
      </h3>

      <div class="space-y-3 mb-6">
        <!-- Server Uptime -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="text-gray-400" />
            <span class="font-medium">Server Uptime</span>
          </div>
          <span class="text-sm">{{ uptime || 'Unknown' }}</span>
        </div>

        <!-- PHP Version -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-code-bracket" class="text-gray-400" />
            <span class="font-medium">PHP Version</span>
          </div>
          <span class="text-sm">{{ phpVersion || 'Unknown' }}</span>
        </div>

        <!-- Database Status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-table-cells" class="text-gray-400" />
            <span class="font-medium">Database</span>
          </div>
          <span class="flex items-center">
            <UIcon
              :name="getStatusIcon(database.status)"
              :class="getStatusColor(database.status)"
              class="mr-1"
            />
            <span class="text-sm">{{ database.status }} ({{ database.responseTime }}ms)</span>
          </span>
        </div>

        <!-- Cache Status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-archive-box" class="text-gray-400" />
            <span class="font-medium">Cache System</span>
          </div>
          <span class="flex items-center">
            <UIcon
              :name="getStatusIcon(cache.status)"
              :class="getStatusColor(cache.status)"
              class="mr-1"
            />
            <span class="text-sm">{{ cache.type }} ({{ cache.status }})</span>
          </span>
        </div>

        <!-- Extensions Status -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-puzzle-piece" class="text-gray-400" />
            <span class="font-medium">Extensions</span>
          </div>
          <span class="text-sm"
            >{{ extensions.enabled || 0 }} enabled / {{ extensions.total || 0 }} total</span
          >
        </div>

        <!-- Current Time -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-calendar" class="text-gray-400" />
            <span class="font-medium">Server Time</span>
          </div>
          <span class="text-sm">{{ time.current }} ({{ time.timezone }})</span>
        </div>
      </div>

      <!-- Recent Logs Summary -->
      <div v-if="recentLogs && recentLogs.length > 0" class="mb-6">
        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center">
          <UIcon name="i-heroicons-document-text" class="mr-1" />
          Recent Logs
        </h3>

        <div
          class="text-xs space-y-1 max-h-32 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded p-2"
        >
          <div v-for="(log, index) in recentLogs.slice(0, 3)" :key="index" class="truncate">
            {{ log }}
          </div>
          <div v-if="recentLogs.length > 3" class="text-gray-500">
            + {{ recentLogs.length - 3 }} more log entries
          </div>
        </div>
      </div>

      <div class="pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
        <div class="inline-flex items-center gap-2" :class="getOverallStatusClasses()">
          <UIcon :name="getOverallStatus().icon" />
          <span>{{ getOverallStatus().text }}</span>
        </div>
        <div class="text-sm text-gray-500 mt-1">Last updated: {{ lastUpdated }}</div>
      </div>
    </div>
  </UCard>
</template>
