<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDashboardOverviewStore } from '@/stores/dashboardOverview'

const store = useDashboardOverviewStore()
const activeTab = ref('upcoming')

const loading = computed(() => store.jobs.loading)
const error = computed(() => store.jobs.error)
const upcomingJobs = computed(() => store.jobs.upcoming)
const recentJobs = computed(() => store.jobs.recentlyRun)
const failedJobs = computed(() => store.jobs.failed)

// Define tabs with badge for failed jobs
const tabs = computed(() => [
  {
    label: 'Upcoming',
    slot: 'upcoming',
    icon: 'i-heroicons-calendar',
  },
  {
    label: 'Recent',
    slot: 'recent',
    icon: 'i-heroicons-clock',
  },
  {
    label: 'Failed',
    slot: 'failed',
    icon: 'i-heroicons-exclamation-triangle',
    badge: failedJobs.value.length || undefined,
    badgeVariant: 'solid',
    badgeColor: 'red',
  },
])

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('default', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function refresh() {
  store.fetchJobs()
}

function runJob(jobId: number) {
  store.runJob(jobId)
}
</script>
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold flex items-center">
          <UIcon name="i-heroicons-clock" class="mr-2" />
          Scheduled Jobs
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

    <ULoader v-if="loading" class="py-8" />

    <div v-else-if="error" class="p-4 text-red-600 dark:text-red-400">
      <UIcon name="i-heroicons-exclamation-triangle" class="mr-2" />
      <span>{{ error }}</span>
    </div>

    <div v-else>
      <UTabs :items="tabs">
        <template #default="{ activeTab }">
          <!-- Upcoming Jobs -->
          <div v-if="activeTab === 'upcoming'" class="divide-y dark:divide-gray-800">
            <div v-if="upcomingJobs.length === 0" class="py-8 text-center text-gray-500">
              <UIcon name="i-heroicons-calendar" class="text-4xl mb-2" />
              <p>No upcoming jobs to display</p>
            </div>
            <div v-else v-for="job in upcomingJobs" :key="job.id" class="py-3">
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <div class="font-medium">{{ job.name }}</div>
                  <div class="text-xs text-gray-500">Next run: {{ formatDate(job.next_run) }}</div>
                </div>
                <UButton
                  size="xs"
                  color="primary"
                  variant="ghost"
                  icon="i-heroicons-play"
                  @click="runJob(job.id)"
                />
              </div>
            </div>
          </div>

          <!-- Recent Jobs -->
          <div v-if="activeTab === 'recent'" class="divide-y dark:divide-gray-800">
            <div v-if="recentJobs.length === 0" class="py-8 text-center text-gray-500">
              <UIcon name="i-heroicons-clock" class="text-4xl mb-2" />
              <p>No recent jobs to display</p>
            </div>
            <div v-else v-for="job in recentJobs" :key="job.id" class="py-3">
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <div class="font-medium">{{ job.name }}</div>
                  <div class="text-xs text-gray-500">Ran: {{ formatDate(job.last_run) }}</div>
                </div>
                <UBadge
                  :color="
                    job.status === 'completed' ? 'green' : job.status === 'failed' ? 'red' : 'gray'
                  "
                  size="sm"
                >
                  {{ job.status }}
                </UBadge>
              </div>
            </div>
          </div>

          <!-- Failed Jobs -->
          <div v-if="activeTab === 'failed'" class="divide-y dark:divide-gray-800">
            <div v-if="failedJobs.length === 0" class="py-8 text-center text-gray-500">
              <UIcon name="i-heroicons-check-circle" class="text-4xl mb-2 text-green-500" />
              <p>No failed jobs to display</p>
            </div>
            <div v-else v-for="job in failedJobs" :key="job.id" class="py-3">
              <div class="flex items-center gap-3">
                <div class="flex-1">
                  <div class="font-medium">{{ job.name }}</div>
                  <div class="text-xs text-red-500">
                    {{ job.error }}
                  </div>
                </div>
                <UButton
                  size="xs"
                  color="primary"
                  variant="ghost"
                  icon="i-heroicons-arrow-path"
                  @click="runJob(job.id)"
                />
              </div>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </UCard>
</template>
