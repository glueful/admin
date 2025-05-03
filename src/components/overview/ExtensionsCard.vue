<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDashboardOverviewStore } from '@/stores/dashboardOverview'
// import { useToastNotification } from '@/composables/useToastNotification'

const store = useDashboardOverviewStore()
// const toast = useToastNotification()

const loading = computed(() => store.extensions.loading)
const error = computed(() => store.extensions.error)
const total = computed(() => store.extensions.total)
const enabled = computed(() => store.extensions.enabled)
const disabled = computed(() => store.extensions.disabled)
const extensionsList = computed(() => store.extensions.list || [])

// For confirmation dialog
const showConfirm = ref(false)
const pendingAction = ref<{ name: string; enable: boolean } | null>(null)
const processingExtension = ref('')

async function refresh() {
  await store.fetchExtensions()
}

function confirmToggleExtension(name: string, enable: boolean) {
  pendingAction.value = { name, enable }
  showConfirm.value = true
}

// async function toggleExtension() {
//   if (!pendingAction.value) return

//   const { name, enable } = pendingAction.value
//   processingExtension.value = name
//   showConfirm.value = false

//   try {
//     const success = await store.toggleExtension(name, enable)

//     if (success) {
//       toast.success({
//         title: `Extension ${enable ? 'enabled' : 'disabled'}`,
//         description: `Successfully ${enable ? 'enabled' : 'disabled'} the ${name} extension`,
//       })
//     } else {
//       toast.error({
//         title: `Failed to ${enable ? 'enable' : 'disable'} extension`,
//         description: `Unable to ${enable ? 'enable' : 'disable'} the ${name} extension`,
//       })
//     }
//   } catch (err) {
//     console.error(`Error toggling extension ${name}:`, err)
//     toast.error({
//       title: 'Error',
//       description: `An error occurred while ${enable ? 'enabling' : 'disabling'} the extension`,
//     })
//   } finally {
//     processingExtension.value = ''
//     pendingAction.value = null
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
          <UIcon name="i-heroicons-puzzle-piece" class="mr-2" />
          Extensions
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
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-primary-500">{{ total }}</div>
          <div class="text-sm text-gray-500">Total</div>
        </div>

        <div class="text-center">
          <div class="text-3xl font-bold text-green-500">{{ enabled }}</div>
          <div class="text-sm text-gray-500">Enabled</div>
        </div>

        <div class="text-center">
          <div class="text-3xl font-bold text-gray-500">{{ disabled }}</div>
          <div class="text-sm text-gray-500">Disabled</div>
        </div>
      </div>

      <div v-if="extensionsList.length">
        <div class="space-y-3">
          <div
            v-for="ext in extensionsList.slice(0, 5)"
            :key="ext.name"
            class="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-md transition hover:bg-gray-100 dark:hover:bg-gray-800/70"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="font-medium">{{ ext.name }}</div>
              <UBadge :color="ext.enabled ? 'success' : 'neutral'" variant="subtle" size="sm">
                {{ ext.enabled ? 'Enabled' : 'Disabled' }}
              </UBadge>
            </div>

            <div class="text-xs text-gray-500 mb-2" v-if="ext.version">v{{ ext.version }}</div>
            <div class="text-xs text-gray-500 mb-2" v-else>Version unknown</div>

            <div
              class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2"
              v-if="ext.description"
            >
              {{ ext.description }}
            </div>
            <div class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2" v-else>
              No description available
            </div>

            <div class="flex justify-between items-center">
              <div class="text-xs text-gray-500" v-if="ext.author">By {{ ext.author }}</div>
              <div class="text-xs text-gray-500" v-else>&nbsp;</div>

              <UButton
                size="xs"
                :color="ext.enabled ? 'neutral' : 'success'"
                :loading="processingExtension === ext.name"
                @click="confirmToggleExtension(ext.name, !ext.enabled)"
              >
                {{ ext.enabled ? 'Disable' : 'Enable' }}
              </UButton>
            </div>
          </div>
        </div>

        <div v-if="extensionsList.length > 5" class="mt-4 text-center">
          <UButton variant="link" to="/extensions" size="sm">
            View All {{ extensionsList.length }} Extensions
          </UButton>
        </div>
      </div>

      <div v-else class="py-8 text-center text-gray-500">
        <UIcon name="i-heroicons-puzzle-piece" class="text-4xl mb-2" />
        <p>No extensions are currently installed</p>
      </div>
    </div>
  </UCard>

  <!-- Confirmation Dialog -->
  <!-- <UModal v-model="showConfirm">
    <UCard>
      <template #header>
        <div class="flex items-center">
          <UIcon
            :name="pendingAction?.enable ? 'i-heroicons-check-circle' : 'i-heroicons-minus-circle'"
            class="mr-2"
            :class="pendingAction?.enable ? 'text-green-500' : 'text-gray-500'"
          />
          <h3 class="text-lg font-medium">
            {{ pendingAction?.enable ? 'Enable' : 'Disable' }} Extension
          </h3>
        </div>
      </template>
      <div class="py-4">
        <p>
          Are you sure you want to {{ pendingAction?.enable ? 'enable' : 'disable' }}
          <strong>{{ pendingAction?.name }}</strong
          >?
        </p>
        <p class="mt-2 text-sm text-gray-500">
          {{
            pendingAction?.enable
              ? 'This will activate the extension and its functionality will be available.'
              : 'This will deactivate the extension and its functionality will be unavailable.'
          }}
        </p>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton color="gray" @click="showConfirm = false">Cancel</UButton>
          <UButton
            :color="pendingAction?.enable ? 'green' : 'gray'"
            @click="toggleExtension"
            :loading="loading"
          >
            Yes, {{ pendingAction?.enable ? 'Enable' : 'Disable' }} Extension
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal> -->
</template>
