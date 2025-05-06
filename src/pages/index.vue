<template>
  <DashboardPanel id="overview">
    <template #header>
      <DashboardNavbar title="Overview">
        <div class="refresh-bar">
          <span class="last-refreshed"> Last refreshed: {{ lastRefreshed }} </span>
          <button
            @click="refreshAll"
            class="refresh-all-btn"
            :disabled="isLoading"
            :class="{ loading: isLoading }"
          >
            <i class="fas fa-sync-alt"></i>
            Refresh All
          </button>
        </div>
      </DashboardNavbar>
    </template>
    <template #body>
      <PageGrid class="lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-4">
        <DatabaseStatsCard />
        <ApiMetricsCard />
        <SystemHealthCard />
        <ExtensionsCard />
        <MigrationsCard />
      </PageGrid>
    </template>
  </DashboardPanel>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDashboardOverviewStore } from '@/stores/dashboardOverview'

const store = useDashboardOverviewStore()

// Get computed values from the store
const isLoading = computed(() => store.isLoading)
const lastRefreshed = computed(() => store.lastRefreshed)

// Initialize data when component is mounted
onMounted(async () => {
  await store.fetchMigrations()
  await store.fetchExtensions()
})

// Method to refresh all dashboard data
async function refreshAll() {
  await store.fetchDashboardData()
}
</script>

<route lang="json">
{
  "meta": {
    "layout": "dashboard",
    "requiresAuth": true
  }
}
</route>
