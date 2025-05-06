<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDashboardOverviewStore } from '@/stores/dashboardOverview'
// import { useToastNotification } from '@/composables/useToastNotification'

const store = useDashboardOverviewStore()
// const toast = useToastNotification()

const loading = computed(() => store.migrations.loading)
const error = computed(() => store.migrations.error)
const pending = computed(() => store.migrations.pending)
const pendingCount = computed(() => store.migrations.totalPending)
const showConfirm = ref(false)

async function refresh() {
  await store.fetchMigrations()
}

// async function runMigrations() {
//   showConfirm.value = false
//   const result = await store.runMigrations()

//   if (result.success) {
//     toast.success({
//       title: 'Migrations completed',
//       description: `Successfully applied ${result.applied.length} migration${result.applied.length !== 1 ? 's' : ''}.`,
//     })
//   } else {
//     toast.error({
//       title: 'Failed to run migrations',
//       description: result.message,
//     })
//   }
// }

onMounted(async () => {
  await refresh()
})
</script>
<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold flex items-center">
          <UIcon name="i-heroicons-code-bracket" class="mr-2" />
          Migrations Status
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
      <div class="flex justify-center mb-6">
        <div class="text-center">
          <div
            class="text-3xl font-bold"
            :class="pendingCount > 0 ? 'text-amber-500' : 'text-green-500'"
          >
            {{ pendingCount }}
          </div>
          <div class="text-sm text-gray-500">Pending Migrations</div>
        </div>
      </div>

      <div v-if="pendingCount > 0">
        <h3 class="text-md font-semibold mb-2">Pending Migrations</h3>
        <ul class="space-y-1">
          <li
            v-for="migration in pending"
            :key="migration.name"
            class="py-2 px-3 rounded-md bg-gray-50 dark:bg-gray-800/50 font-mono text-sm"
          >
            {{ migration.name }}
          </li>
        </ul>

        <div class="mt-4 flex justify-center">
          <UButton color="primary" icon="i-heroicons-play" @click="showConfirm = true">
            Run All Pending Migrations
          </UButton>
        </div>
      </div>

      <div v-else class="py-8 flex flex-col items-center justify-center text-center">
        <UIcon name="i-heroicons-check-circle" class="text-4xl mb-2 text-green-500" />
        <p>All migrations have been applied.</p>
      </div>
    </div>
  </UCard>

  <!-- Confirmation Dialog -->
  <!-- <UModal v-model:open="showConfirm">
    <UCard>
      <template #header>
        <div class="flex items-center">
          <UIcon name="i-heroicons-exclamation-triangle" class="mr-2 text-amber-500" />
          <h3 class="text-lg font-medium">Confirm Migration</h3>
        </div>
      </template>
      <div class="py-4">
        <p>
          Are you sure you want to run {{ pendingCount }} pending migration{{
            pendingCount !== 1 ? 's' : ''
          }}?
        </p>
        <p class="mt-2 text-sm text-gray-500">
          This action might modify your database structure and can't be easily reversed.
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="neutral" @click="showConfirm = false">Cancel</UButton>
          <UButton color="primary" @click="runMigrations" :loading="loading">
            Yes, Run Migrations
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal> -->
</template>
