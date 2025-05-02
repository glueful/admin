<script lang="ts" setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { EditorView } from '@codemirror/view'
import { sql } from '@codemirror/lang-sql'
import { keymap } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import { basicSetup } from 'codemirror'
import { useSQLQueriesStore } from '@/stores/sqlQueries'
import type { SQLQuery } from '@/stores/sqlQueries'
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { useToastNotification } from '@/composables/useToastNotification'
import { sqlCompletions } from '@/composables/useSqlCompletions'

// Initialize the SQL queries store
const sqlQueriesStore = useSQLQueriesStore()
const toast = useToastNotification()

// For client-side only rendering
const isMounted = ref(false)
const state = reactive({
  name: '',
})
// Validate the save query form
const validateSaveQueryForm = (state: any): FormError[] => {
  const errors = []
  if (!state.name.trim()) errors.push({ name: 'name', message: 'Query name is required' })

  return errors
}

// Editor state
const sqlQuery = ref('SELECT * FROM users LIMIT 10;')
const selectedDatabase = ref('')
const showSaveDialog = ref(false)
const isQueryHistory = ref(false)
const allowWrite = ref(false) // Add this line for the allow_write flag

// Computed properties from store state
const isExecuting = computed(() => sqlQueriesStore.isLoading)
const queryResult = computed(() => sqlQueriesStore.queryResults)
const isError = computed(() => sqlQueriesStore.hasError)
const executionTime = computed(() => sqlQueriesStore.queryResults?.execution_time || 0)
const queryHistory = computed(() => sqlQueriesStore.getQueryHistory)
const savedQueries = computed(() => sqlQueriesStore.getSavedQueries)
const predefinedQueries = computed(() => sqlQueriesStore.getPredefinedQueries)

// Table columns and rows for results
const resultColumns: any = ref([])
const resultRows: any = ref([])

// Available databases
const databases = ref([
  { label: 'Default Database', value: 'default' },
  // Add more databases if available
])

// CodeMirror extensions
const extensions = [
  basicSetup,
  sql(),
  sqlCompletions(),
  EditorView.lineWrapping,
  keymap.of([
    {
      key: 'Ctrl-Enter',
      run: () => {
        executeQuery()
        return true
      },
    },
    ...defaultKeymap,
  ]),
]

// Load saved queries when component mounts
onMounted(async () => {
  selectedDatabase.value = databases.value[0]?.value || ''
  isMounted.value = true

  try {
    // Load both saved and predefined queries
    await Promise.all([sqlQueriesStore.loadSavedQueries(), sqlQueriesStore.loadPredefinedQueries()])
  } catch (error) {
    console.error('Failed to load queries:', error)
  }
})

// Execute the SQL query using the store
async function executeQuery() {
  if (!sqlQuery.value.trim() || isExecuting.value) return

  resultColumns.value = []
  resultRows.value = []

  const query: SQLQuery = {
    query: sqlQuery.value,
    params: [],
    allow_write: allowWrite.value, // Use the checkbox value to control write permissions
  }

  try {
    await sqlQueriesStore.executeQuery(query)

    if (!isError.value && queryResult.value) {
      if (Array.isArray(queryResult.value.data) && queryResult.value.data.length > 0) {
        // Check if we have detailed column information available
        if (Array.isArray(queryResult.value.columns) && queryResult.value.columns.length > 0) {
          // Check if the column is an object with a name property (using safer type checking)
          const sampleRecord = queryResult.value.data[0]
          // Use type assertion to help TypeScript understand this is an array of column objects
          resultColumns.value = Object.keys(sampleRecord).map((key) => {
            return {
              accessorKey: key,
              header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
              cell: ({ row }: any) => {
                const value = row.getValue(key)

                return value
              },
            }
          })
        }

        // Format rows
        resultRows.value = queryResult.value.data

        // Debug logging
        console.log('Data structure:', {
          columns: resultColumns.value,
          rows: resultRows.value.slice(0, 1), // Just log the first row to avoid cluttering the console
          queryResult: queryResult.value,
        })
      }
    }
  } catch (error) {
    console.error('Query execution error:', error)
  }
}

// Save the current query
async function onSaveQuerySubmit(event: FormSubmitEvent<typeof state>) {
  console.log('Save query form submitted:', event)
  try {
    await sqlQueriesStore.saveQuery({
      query: sqlQuery.value,
      name: event.data.name,
    })

    toast.success({
      title: 'Query Saved',
      description: `Query "${event.data.name}" saved successfully.`,
    })

    // Reset form and close dialog
    showSaveDialog.value = false
    state.name = ''
  } catch (error: any) {
    toast.error({
      title: 'Error',
      description: error.message || 'Failed to save query',
    })
    console.error('Failed to save query:', error)
  }
}

// Load a saved or history query
function loadQuery(query: SQLQuery) {
  sqlQuery.value = query.query
  isQueryHistory.value = false
}

// Clear the query editor
function clearQuery() {
  sqlQuery.value = ''
  sqlQueriesStore.clearQueryResults()
}

// Clear query history
function clearHistory() {
  sqlQueriesStore.clearQueryHistory()
}

// Delete a saved query
const showDeleteDialog = ref(false)
const queryToDelete = ref<string | number | null>(null)

async function deleteSavedQuery(id: string | number) {
  // Show the delete confirmation modal
  showDeleteDialog.value = true
  queryToDelete.value = id
}

// File import reference for importing queries
const fileInputRef = ref<HTMLInputElement | null>(null)

// Handle file import for SQL queries
function handleFileImport(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0]
  sqlQueriesStore
    .importQueries(file)
    .then(() => {
      toast.success({
        title: 'Queries Imported',
        description: 'Queries have been successfully imported.',
      })
      // Reset the file input
      if (fileInputRef.value) fileInputRef.value.value = ''
    })
    .catch((error) => {
      toast.error({
        title: 'Import Failed',
        description: error.message || 'Failed to import queries.',
      })
    })
}

// Confirm query deletion
async function confirmDeleteQuery() {
  if (!queryToDelete.value) return

  try {
    await sqlQueriesStore.deleteSavedQuery(queryToDelete.value)

    toast.success({
      title: 'Query Deleted',
      description: 'The saved query has been deleted successfully.',
    })

    // Reset and close dialog
    queryToDelete.value = null
    showDeleteDialog.value = false
  } catch (error: any) {
    toast.error({
      title: 'Error',
      description: error.message || 'Failed to delete query',
    })
    console.error('Failed to delete saved query:', error)
  }
}

// For delete all queries confirmation
const showDeleteAllDialog = ref(false)

// Delete all saved queries
async function deleteAllSavedQueries() {
  showDeleteAllDialog.value = true
}

// Confirm deletion of all saved queries
async function confirmDeleteAllQueries() {
  try {
    await sqlQueriesStore.deleteAllSavedQueries()

    toast.success({
      title: 'All Queries Deleted',
      description: 'All saved queries have been deleted successfully.',
    })

    // Close dialog
    showDeleteAllDialog.value = false
  } catch (error: any) {
    toast.error({
      title: 'Error',
      description: error.message || 'Failed to delete queries',
    })
    console.error('Failed to delete all saved queries:', error)
  }
}
</script>
<template>
  <DashboardPanel id="commands">
    <template #header>
      <DashboardNavbar title="SQL Editor"></DashboardNavbar>
    </template>
    <template #body>
      <div class="p-4 space-y-4">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">SQL Editor</h3>
              <div class="flex items-center gap-2">
                <USwitch
                  v-model="allowWrite"
                  label="Allow Write"
                  size="md"
                  color="success"
                  class="mr-5"
                />
                <UButton
                  color="primary"
                  icon="i-heroicons-play"
                  :loading="isExecuting"
                  :disabled="!sqlQuery.trim() || isExecuting"
                  @click="executeQuery"
                >
                  Execute
                </UButton>
                <UButton
                  icon="i-heroicons-bookmark"
                  @click="showSaveDialog = true"
                  :disabled="!sqlQuery.trim()"
                >
                  Save
                </UButton>
                <UButton icon="i-heroicons-trash" @click="clearQuery" :disabled="!sqlQuery.trim()">
                  Clear
                </UButton>
              </div>
            </div>
          </template>

          <!-- SQL Editor -->
          <div class="h-64 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <template v-if="isMounted">
              <Codemirror
                v-model="sqlQuery"
                placeholder="Enter SQL query here..."
                :style="{ height: '100%' }"
                :indent-with-tab="true"
                :tab-size="2"
                :extensions="extensions"
              />
            </template>
            <div v-else class="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <p class="text-gray-500">Loading editor...</p>
            </div>
          </div>

          <template #footer>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Press Ctrl+Enter to execute the query
            </div>
          </template>
        </UCard>
        <!-- Query Results -->
        <UCard v-if="queryResult">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">Results</h3>
              <div class="text-sm text-gray-500">
                {{ executionTime ? `Executed in ${executionTime}ms` : '' }}
              </div>
            </div>
          </template>

          <div
            v-if="isError"
            class="p-4 bg-red-50 dark:bg-red-900/20 rounded-md text-red-600 dark:text-red-400"
          >
            <p class="font-medium">Error</p>
            <p>{{ queryResult.error || 'An unknown error occurred' }}</p>
          </div>

          <div v-else>
            <!-- Results as Table -->
            <div v-if="resultColumns.length" class="overflow-x-auto">
              <div v-if="queryResult.data && queryResult.data.length > 0">
                <pre
                  class="mb-2 text-xs text-gray-500 p-2 bg-gray-50 dark:bg-gray-800 rounded overflow-auto"
                  >{{ sqlQuery }}</pre
                >

                <!-- Debug information -->
                <!-- <div class="mb-4 text-xs text-gray-500 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <p>Data available: {{ resultRows.length > 0 ? 'Yes' : 'No' }}</p>
                  <p>Columns available: {{ resultColumns.length > 0 ? 'Yes' : 'No' }}</p>
                </div> -->

                <div>
                  <UTable
                    :columns="resultColumns"
                    :data="sqlQueriesStore.queryResults?.data"
                    :loading="isExecuting"
                    class="w-full"
                    :ui="{
                      th: 'px-4 py-3.5 text-sm text-highlighted text-left rtl:text-right font-semibold whitespace-nowrap [&:has([role=checkbox])]:pe-0',
                    }"
                  >
                    <template #empty>
                      <div class="p-4 text-center text-gray-500">No results available</div>
                    </template>
                  </UTable>
                </div>

                <div
                  class="p-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800"
                >
                  {{ resultRows.length }} of {{ resultRows.length }} row{{
                    resultRows.length !== 1 ? 's' : ''
                  }}
                </div>
              </div>
              <div v-else class="p-4 text-center text-gray-500">
                Query executed successfully, but no rows were returned.
              </div>
            </div>
          </div>
        </UCard>

        <!-- Saved Queries, Predefined Queries, and History -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Predefined Queries -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Predefined Queries</h3>
              </div>
            </template>

            <div v-if="!predefinedQueries.length" class="p-4 text-gray-500 text-center">
              No predefined queries available
            </div>

            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="query in predefinedQueries"
                :key="query.id"
                :class="[
                  'p-3 flex flex-col cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  sqlQuery === query.query ? 'bg-gray-50 dark:bg-gray-800/50' : '',
                ]"
                @click="loadQuery(query)"
              >
                <div class="flex items-center gap-3">
                  <UIcon name="i-heroicons-document-text" class="shrink-0 text-gray-400" />
                  <div class="font-medium">{{ query.name }}</div>
                </div>

                <div v-if="query.description" class="text-xs text-gray-500 mt-1 pl-8">
                  {{ query.description }}
                </div>

                <div class="text-xs text-gray-500 mt-1 pl-8 truncate">
                  {{ query.query }}
                </div>
              </div>
            </div>
          </UCard>

          <!-- Saved Queries -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Saved Queries</h3>
                <div class="flex items-center gap-2">
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-arrow-down-tray"
                    @click="() => fileInputRef?.click()"
                    title="Import queries from file"
                  >
                    Import
                  </UButton>
                  <input
                    ref="fileInputRef"
                    type="file"
                    accept=".json"
                    class="hidden"
                    @change="handleFileImport"
                  />
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-arrow-up-tray"
                    @click="sqlQueriesStore.exportQueries()"
                    :disabled="!savedQueries.length"
                    title="Export saved queries"
                  >
                    Export
                  </UButton>
                  <UButton
                    size="xs"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    color="error"
                    @click="deleteAllSavedQueries"
                    :disabled="!savedQueries.length"
                    title="Delete all saved queries"
                  >
                    Delete All
                  </UButton>
                </div>
              </div>
            </template>

            <div v-if="savedQueries.length === 0" class="p-4 text-gray-500 text-center">
              No saved queries available
            </div>

            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="query in savedQueries"
                :key="query.id"
                :class="[
                  'p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  sqlQuery === query.query ? 'bg-gray-50 dark:bg-gray-800/50' : '',
                ]"
                @click="loadQuery(query)"
              >
                <UIcon name="i-heroicons-bookmark" class="shrink-0 text-gray-400" />

                <div class="flex-1 truncate">
                  <div class="font-medium">{{ query.name }}</div>
                  <div class="text-xs text-gray-500 truncate">{{ query.query }}</div>
                </div>

                <UButton
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click.stop="deleteSavedQuery(query.id!)"
                />
              </div>
            </div>
          </UCard>

          <!-- Query History -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold">Query History</h3>
                <UButton
                  v-if="queryHistory.length > 0"
                  size="xs"
                  variant="ghost"
                  icon="i-heroicons-trash"
                  @click="clearHistory"
                >
                  Clear History
                </UButton>
              </div>
            </template>

            <div v-if="queryHistory.length === 0" class="p-4 text-gray-500 text-center">
              No query history available
            </div>

            <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <div
                v-for="(query, index) in queryHistory"
                :key="index"
                :class="[
                  'p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  sqlQuery === query.query ? 'bg-gray-50 dark:bg-gray-800/50' : '',
                ]"
                @click="loadQuery(query)"
              >
                <UIcon name="i-heroicons-clock" class="shrink-0 text-gray-400" />

                <div class="flex-1 truncate">
                  <div class="text-xs text-gray-500">
                    {{ new Date(query.created_at || Date.now()).toLocaleString() }}
                  </div>
                  <div class="text-sm truncate">{{ query.query }}</div>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </DashboardPanel>
  <!-- Save Query Dialog -->
  <UModal v-model:open="showSaveDialog" title="Save Query" v-if="showSaveDialog">
    <template #body>
      <UForm :state="state" :validate="validateSaveQueryForm" @submit="onSaveQuerySubmit">
        <UFormField label="Query Name" name="name" required>
          <UInput v-model="state.name" placeholder="Enter a name for this query" class="w-full" />
        </UFormField>

        <div class="text-sm text-gray-500 mt-2">
          <div class="font-medium">Query:</div>
          <div class="truncate">{{ sqlQuery }}</div>
        </div>

        <div class="flex justify-end gap-2 mt-4">
          <UButton type="button" variant="ghost" @click="showSaveDialog = false"> Cancel </UButton>
          <UButton type="submit" color="primary" :disabled="!state.name.trim()"> Save </UButton>
        </div>
      </UForm>
    </template>
  </UModal>

  <!-- Delete Query Confirmation Dialog -->
  <UModal v-model:open="showDeleteDialog" title="Confirm Deletion" v-if="showDeleteDialog">
    <template #body>
      <div class="p-4">
        <p>Are you sure you want to delete this saved query?</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton type="button" variant="ghost" @click="showDeleteDialog = false"> Cancel </UButton>
        <UButton type="button" color="error" @click="confirmDeleteQuery"> Delete </UButton>
      </div>
    </template>
  </UModal>

  <!-- Delete All Queries Confirmation Dialog -->
  <UModal v-model:open="showDeleteAllDialog" title="Confirm Deletion" v-if="showDeleteAllDialog">
    <template #body>
      <div class="p-4">
        <p>Are you sure you want to delete all saved queries?</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton type="button" variant="ghost" @click="showDeleteAllDialog = false">
          Cancel
        </UButton>
        <UButton type="button" color="error" @click="confirmDeleteAllQueries"> Delete All </UButton>
      </div>
    </template>
  </UModal>
</template>
<route lang="json">
{
  "meta": {
    "layout": "dashboard",
    "requiresAuth": true
  }
}
</route>
