<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDBTablesStore } from '@/stores/dbTables'
import { useSortable } from '@vueuse/integrations/useSortable'
import type { TabsItem } from '@nuxt/ui'
import type {
  CreateTableRequest,
  ReferencedTableColumns,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from './types'
import { reservedKeywords, columnTypes, formatDatabaseName, needsLength } from './db'

// Props and emits definition
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  slideoverTitle: {
    type: String,
    default: 'Create New Table',
  },
})

const emit = defineEmits(['update:open', 'close', 'submit'])

// Get the store for table operations
const dbTablesStore = useDBTablesStore()

// Create a computed property for two-way binding of open state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

// Form state
const tableName = ref('')
const tableNameError = ref<string | undefined>(undefined)
const columns = ref<TableColumn[]>([])
const indexes = ref<TableIndex[]>([])
const foreignKeys = ref<TableForeignKey[]>([])
const isSubmitting = ref(false)
// Track collapsible state for each column
const collapsibleState = ref<Record<number, boolean>>({})
// Track collapsible state for indexes
const indexCollapsibleState = ref<Record<number, boolean>>({})
// Track collapsible state for foreign keys
const foreignKeyCollapsibleState = ref<Record<number, boolean>>({})

// Computed properties
const isValid = computed(() => {
  return (
    tableName.value.trim() !== '' &&
    !tableNameError.value &&
    columns.value.length > 0 &&
    columns.value.every((col: TableColumn) => col.name.trim() !== '' && !col.nameError)
  )
})

const hasPrimaryKey = computed((): boolean => {
  return columns.value.some((col: TableColumn) => col.options?.primary)
})

// Check if there are any valid columns with names
const hasValidColumns = computed((): boolean => {
  return (
    columns.value.length > 0 && columns.value.some((col: TableColumn) => col.name.trim() !== '')
  )
})

// Validate a database object name (table or column) based on naming rules
function validateDatabaseName(name: string, type: 'table' | 'column'): string | undefined {
  if (!name.trim()) {
    return `${type === 'table' ? 'Table' : 'Column'} name is required`
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return `${type === 'table' ? 'Table' : 'Column'} must start with letter or underscore and contain only letters, numbers, and underscores`
  }

  if (reservedKeywords.includes(name.toLowerCase())) {
    return `${type === 'table' ? 'Table' : 'Column'} name cannot be a reserved SQL keyword`
  }

  // For table names, check if it already exists in the database
  if (type === 'table') {
    // Safely check for duplicate table names with type assertions
    const existingTables = dbTablesStore.tables as any[]
    const isDuplicate = existingTables.some((table) => {
      // Check if table is a string or an object with a name property
      if (typeof table === 'string') {
        return table.toLowerCase() === name.toLowerCase()
      } else if (table && typeof table === 'object' && table.name) {
        return table.name.toLowerCase() === name.toLowerCase()
      }
      return false
    })

    if (isDuplicate) {
      return `Table '${name}' already exists in the database`
    }
  }

  return undefined
}

// Validate a column name based on database naming rules
function validateColumnName(name: string): string | undefined {
  return validateDatabaseName(name, 'column')
}

// Validate a table name based on database naming rules
function validateTableName(name: string): string | undefined {
  return validateDatabaseName(name, 'table')
}

// Add default columns function
function addDefaultColumns() {
  // Clear existing columns first
  if (columns.value.length === 0) {
    // Define default columns
    const defaultColumns = [
      {
        name: 'id',
        type: 'bigInteger',
        options: {
          length: '20',
          nullable: false,
          primary: true,
          autoIncrement: true,
        },
        nameError: undefined,
      },
      {
        name: 'uuid',
        type: 'char',
        options: {
          length: '12',
          nullable: false,
          primary: false,
        },
        nameError: undefined,
      },
      {
        name: 'created_at',
        type: 'timestamp',
        options: {
          length: null,
          nullable: false,
          primary: false,
          default: 'CURRENT_TIMESTAMP',
        },
        nameError: undefined,
      },
      {
        name: 'updated_at',
        type: 'timestamp',
        options: {
          length: null,
          nullable: true,
          primary: false,
        },
        nameError: undefined,
      },
    ]

    // Add the default columns
    defaultColumns.forEach((column) => {
      const index = columns.value.length
      columns.value.push(column)
      // Set collapsed state by default
      collapsibleState.value[index] = false
    })
  }
}

// Methods
function addColumn() {
  const index = columns.value.length
  columns.value.push({
    name: '',
    type: 'string',
    options: {
      length: '255', // Default length for string columns
      nullable: true,
      primary: columns.value.length === 0, // Make first column primary by default
      autoIncrement: false,
    },
    nameError: undefined,
  })
  // Set default open state for the new column
  collapsibleState.value[index] = true
}

function removeColumn(index: number) {
  columns.value.splice(index, 1)
  // Update collapsible state
  const newState: Record<number, boolean> = {}
  for (let i = 0; i < columns.value.length; i++) {
    newState[i] = collapsibleState.value[i < index ? i : i + 1] || false
  }
  collapsibleState.value = newState
}

// Manage indexes
function addIndex() {
  indexes.value.push({
    type: 'INDEX',
    column: columns.value.length > 0 ? columns.value[0].name : '',
  })
}

function removeIndex(index: number) {
  indexes.value.splice(index, 1)
}

// Manage foreign keys
function addForeignKey() {
  foreignKeys.value.push({
    column: columns.value.length > 0 ? columns.value[0].name : '',
    references: 'id',
    on: '',
  })
}

function removeForeignKey(index: number) {
  foreignKeys.value.splice(index, 1)
}

function handleClose() {
  isOpen.value = false
  emit('close')

  // Reset form
  setTimeout(() => {
    tableName.value = ''
    tableNameError.value = undefined
    columns.value = []
    indexes.value = []
    foreignKeys.value = []
    collapsibleState.value = {}
    indexCollapsibleState.value = {}
    foreignKeyCollapsibleState.value = {}
  }, 100)
}

function handleSubmit() {
  if (!isValid.value) return

  // Validate table name one last time
  tableNameError.value = validateTableName(tableName.value)

  // Validate all column names one last time
  columns.value.forEach((column: TableColumn) => {
    column.nameError = validateColumnName(column.name)
  })

  // If any errors exist, don't submit
  if (tableNameError.value || columns.value.some((column: TableColumn) => column.nameError)) {
    return
  }

  isSubmitting.value = true

  // Prepare data for submission using the new CreateTableRequest format
  // Explicitly type the createTableRequest as CreateTableRequest
  const createTableRequest: CreateTableRequest = {
    table_name: tableName.value.trim(),
    columns: columns.value.map((col: TableColumn) => ({
      name: col.name.trim(),
      type: col.type,
      options: {
        length: needsLength(col.type) ? col.options.length : null,
        nullable: col.options.nullable,
        primary: col.options.primary,
        autoIncrement: col.options.autoIncrement,
        default: col.options.default,
      },
    })),
  }

  // Add indexes if any exist
  if (indexes.value.length > 0) {
    // Filter out any indexes that don't have column names
    const validIndexes = indexes.value.filter((index) => index.column)

    if (validIndexes.length > 0) {
      createTableRequest.indexes = validIndexes.map((index) => ({
        type: index.type,
        column: index.column,
      }))
    }
  }

  // Add foreign keys if any exist
  if (foreignKeys.value.length > 0) {
    // Filter out any foreign keys that don't have complete information
    const validForeignKeys = foreignKeys.value.filter((fk) => fk.column && fk.references && fk.on)

    if (validForeignKeys.length > 0) {
      createTableRequest.foreign_keys = validForeignKeys.map((fk) => ({
        column: fk.column,
        references: fk.references,
        on: fk.on,
      }))
    }
  }

  // Emit submit event with table data
  emit('submit', createTableRequest)

  // In a real implementation, you might want to wait for API response before closing
  setTimeout(() => {
    isSubmitting.value = false
    handleClose()
  }, 500)
}

// Watch for changes in column names to validate them
watch(
  columns,
  (newColumns) => {
    newColumns.forEach((column) => {
      // Auto-format the column name as they type
      if (column.name) {
        const formatted = formatDatabaseName(column.name)
        if (formatted !== column.name) {
          column.name = formatted
        }
      }

      // Validate the column name
      column.nameError = validateColumnName(column.name)
    })
  },
  { deep: true },
)

// Watch for changes in table name to validate it
watch(tableName, (newName) => {
  // Auto-format the table name as user types
  if (newName) {
    const formatted = formatDatabaseName(newName)
    if (formatted !== newName) {
      tableName.value = formatted
    }
  }

  // Validate the table name
  tableNameError.value = validateTableName(newName)
})

// Watch for slideover opening to add default columns
watch(isOpen, (isOpen) => {
  if (isOpen) {
    // Add default columns when the slideover opens
    addDefaultColumns()
  }
})

// Template ref for sortable columns container
const columnsContainer = ref<HTMLElement | null>(null)

// Setup sortable functionality once component is mounted
watch(columnsContainer, (el) => {
  if (el) {
    useSortable(el, columns, {
      animation: 150,
      handle: '.drag-handle',
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      onEnd: () => {
        // Update collapsible state to match new column order
        const newState: Record<number, boolean> = {}
        columns.value.forEach((_: any, index: any) => {
          newState[index] = collapsibleState.value[index] || false
        })
        collapsibleState.value = newState
      },
    })
  }
})

// Define tab items for the main sections
const tabItems = ref<TabsItem[]>([
  {
    label: 'Columns',
    icon: 'i-lucide-columns',
    slot: 'columns-tab' as const,
  },
  {
    label: 'Indexes',
    icon: 'i-lucide-hash',
    slot: 'indexes-tab' as const,
  },
  {
    label: 'Foreign Keys',
    icon: 'i-lucide-network',
    slot: 'foreign-keys-tab' as const,
  },
])

// Format table options for the dropdown
const tableOptions = computed(() => {
  // Check if tables exist and is an array
  if (
    !dbTablesStore.tables ||
    !Array.isArray(dbTablesStore.tables) ||
    dbTablesStore.tables.length === 0
  ) {
    return []
  }

  // Map tables to format required by USelect
  return dbTablesStore.tables
    .map((table) => {
      // Handle both string tables and object tables with name property
      const tableName =
        typeof table === 'string' ? table : table && typeof table === 'object' && table ? table : ''
      return {
        label: tableName,
        value: tableName,
      }
    })
    .filter((item) => item.value !== '') // Filter out any empty names
})

// Check if there are valid columns with names AND there are tables available for foreign keys
const canAddForeignKey = computed(() => {
  return hasValidColumns.value && tableOptions.value.length > 0
})

// Store for fetched reference table columns
const referencedTableColumns = ref<ReferencedTableColumns>({})

// Function to fetch columns for a referenced table
async function fetchTableColumns(tableName: string) {
  if (!tableName || tableName.trim() === '') return

  console.debug('Fetching columns for table:', tableName)

  // Initialize or reset the state for this table
  if (!referencedTableColumns.value[tableName]) {
    referencedTableColumns.value[tableName] = {
      columns: [],
      isLoading: true,
      error: undefined,
    }
  } else {
    referencedTableColumns.value[tableName].isLoading = true
    referencedTableColumns.value[tableName].error = undefined
  }

  try {
    const response = await dbTablesStore.fetchTableColumns(tableName)
    console.debug('API Response for columns:', response)

    // Get the columns from the response
    const columnsData = response ? response.columns || response : []
    console.log('Column data:', columnsData)

    // Transform columns to the format expected by USelect
    if (Array.isArray(columnsData)) {
      referencedTableColumns.value[tableName] = {
        columns: columnsData.map((col: any) => {
          const colName = col.name || col
          return {
            label: typeof colName === 'string' ? `${colName}` : colName,
            value: typeof colName === 'string' ? colName : String(colName),
          }
        }),
        isLoading: false,
        error: undefined,
      }
    } else {
      throw new Error('Invalid column data format')
    }

    console.log('Processed columns for UI:', referencedTableColumns.value[tableName].columns)
  } catch (error: any) {
    console.error('Error fetching columns:', error)
    referencedTableColumns.value[tableName] = {
      columns: [],
      isLoading: false,
      error: error?.message || 'Failed to load columns',
    }
  }
}

// Handle reference table change
function onReferenceTableChange(tableName: any, fkIndex: number) {
  const tableNameString = tableName ? String(tableName) : null
  if (tableNameString) {
    // Reset the references value when table changes
    foreignKeys.value[fkIndex].references = ''

    // Fetch columns for the selected table
    fetchTableColumns(tableNameString)
  }
}
</script>
<template>
  <USlideover
    v-model:open="isOpen"
    :title="slideoverTitle"
    :close="{ onClick: () => handleClose() }"
    side="right"
    class="w-full max-w-lg"
  >
    <template #body>
      <div class="space-y-4">
        <form @submit.prevent="handleSubmit">
          <!-- Table Name Input -->
          <UFormField label="Table Name" name="tableName" required :error="tableNameError">
            <UInput
              v-model="tableName"
              placeholder="Enter table name"
              :disabled="isSubmitting"
              autofocus
              class="w-full"
              :status="tableNameError ? 'error' : undefined"
            />
          </UFormField>

          <!-- Tabbed interface for Columns, Indexes, and Foreign Keys -->
          <div class="mt-6">
            <UTabs :items="tabItems" class="w-full" variant="link">
              <!-- Columns Tab -->
              <template #columns-tab>
                <div class="pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-medium">Columns</h3>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-plus"
                      @click="addColumn"
                      :disabled="isSubmitting"
                    >
                      Add Column
                    </UButton>
                  </div>

                  <!-- Columns list -->
                  <div
                    v-if="columns.length === 0"
                    class="text-sm text-gray-500 text-center py-4 border rounded-md"
                  >
                    No columns added yet. Click "Add Column" to add one.
                  </div>

                  <div v-else class="space-y-3" ref="columnsContainer">
                    <div v-for="(column, index) in columns" :key="index" class="border rounded-md">
                      <UCollapsible v-model:open="collapsibleState[index]" class="w-full">
                        <div class="flex items-center w-full">
                          <div
                            class="flex items-center justify-center px-2 cursor-move drag-handle"
                          >
                            <UIcon
                              name="i-lucide-grip-vertical"
                              class="text-gray-400 hover:text-gray-600"
                            />
                          </div>
                          <UButton
                            class="group flex-1 flex items-center justify-between p-3 text-left"
                            color="neutral"
                            variant="ghost"
                            :trailing-icon="'i-lucide-settings-2'"
                            :ui="{
                              trailingIcon:
                                'group-data-[state=open]:rotate-90 transition-transform duration-200',
                            }"
                          >
                            <div class="flex flex-1 items-center justify-between">
                              <div class="font-medium truncate max-w-[180px]">
                                {{ column.name || 'New Column' }}
                              </div>
                              <div class="text-xs text-gray-500 mr-2">
                                {{ column.type
                                }}{{ needsLength(column.type) ? `(${column.options.length})` : '' }}
                                {{ column.options.primary ? '• Primary' : '' }}
                                {{ column.options.nullable ? '• Nullable' : '' }}
                              </div>
                            </div>
                          </UButton>
                          <UButton
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            size="sm"
                            class="mr-2"
                            @click="removeColumn(index)"
                            :disabled="isSubmitting"
                          />
                        </div>
                        <template #content>
                          <div class="p-3 pt-0">
                            <div class="flex-1">
                              <UFormField
                                label="Column Name"
                                class="mb-4"
                                :required="true"
                                :error="column.nameError"
                              >
                                <UInput
                                  v-model="column.name"
                                  placeholder="Column name"
                                  :disabled="isSubmitting"
                                  class="w-full"
                                  :status="column.nameError ? 'error' : undefined"
                                />
                              </UFormField>
                              <div class="grid grid-cols-2 gap-4 mb-4">
                                <UFormField label="Type">
                                  <USelect
                                    v-model="column.type"
                                    :items="columnTypes"
                                    :disabled="isSubmitting"
                                    placeholder="Select type"
                                    class="w-full"
                                  />
                                </UFormField>
                                <UFormField label="Length">
                                  <UInput
                                    v-model="column.options.length"
                                    placeholder="255"
                                    type="number"
                                    min="1"
                                    :disabled="isSubmitting || !needsLength(column.type)"
                                    class="w-full"
                                  />
                                </UFormField>
                              </div>
                              <div class="flex flex-wrap gap-4">
                                <UCheckbox
                                  v-model="column.options.nullable"
                                  label="Nullable"
                                  :disabled="isSubmitting"
                                />
                                <UCheckbox
                                  v-model="column.options.primary"
                                  label="Primary"
                                  :disabled="
                                    isSubmitting || (hasPrimaryKey && !column.options.primary)
                                  "
                                />
                                <UCheckbox
                                  v-model="column.options.autoIncrement"
                                  label="Auto Increment"
                                  :disabled="isSubmitting || !column.options.primary"
                                />
                              </div>
                            </div>
                            <UFormField label="Default Value" class="mt-4">
                              <UInput
                                v-model="column.options.default"
                                placeholder="Default value"
                                :disabled="isSubmitting"
                                class="w-full"
                              />
                            </UFormField>
                          </div>
                        </template>
                      </UCollapsible>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Indexes Tab -->
              <template #indexes-tab>
                <div class="pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-medium">Indexes</h3>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-plus"
                      @click="addIndex"
                      :disabled="isSubmitting || !hasValidColumns"
                    >
                      Add Index
                    </UButton>
                  </div>

                  <div
                    v-if="indexes.length === 0"
                    class="text-sm text-gray-500 text-center py-4 border rounded-md"
                  >
                    No indexes added yet. Click "Add Index" to add one.
                  </div>
                  <div v-else class="space-y-3">
                    <div v-for="(index, i) in indexes" :key="i" class="border rounded-md">
                      <UCollapsible v-model:open="indexCollapsibleState[i]" class="w-full">
                        <div class="flex items-center w-full">
                          <UButton
                            class="group flex-1 flex items-center justify-between p-3 text-left w-full"
                            color="neutral"
                            variant="ghost"
                            :trailing-icon="'i-lucide-settings-2'"
                            :ui="{
                              trailingIcon:
                                'group-data-[state=open]:rotate-90 transition-transform duration-200',
                            }"
                          >
                            <div class="flex flex-1 items-center justify-between">
                              <!-- <div class="font-medium truncate max-w-[180px]">
                                Index {{ i + 1 }}
                              </div> -->
                              <div class="text-xs text-gray-500 mr-2">
                                {{ index.type }} on {{ index.column }}
                              </div>
                            </div>
                          </UButton>
                          <UButton
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            size="sm"
                            class="mr-2"
                            @click="removeIndex(i)"
                            :disabled="isSubmitting"
                          />
                        </div>
                        <template #content>
                          <div class="p-3 pt-0">
                            <div class="space-y-3">
                              <div class="grid grid-cols-2 gap-4">
                                <UFormField label="Type">
                                  <USelect
                                    v-model="index.type"
                                    :items="[
                                      { label: 'Regular Index', value: 'INDEX' },
                                      { label: 'Unique Index', value: 'UNIQUE' },
                                    ]"
                                    :disabled="isSubmitting"
                                    class="w-full"
                                  />
                                </UFormField>
                                <UFormField label="Column">
                                  <USelect
                                    v-model="index.column"
                                    :items="
                                      columns.map((col: any) => ({
                                        label: col.name,
                                        value: col.name,
                                      }))
                                    "
                                    :disabled="isSubmitting || columns.length === 0"
                                    class="w-full"
                                  />
                                </UFormField>
                              </div>
                            </div>
                          </div>
                        </template>
                      </UCollapsible>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Foreign Keys Tab -->
              <template #foreign-keys-tab>
                <div class="pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-medium">Foreign Keys</h3>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="soft"
                      icon="i-lucide-plus"
                      @click="addForeignKey"
                      :disabled="isSubmitting || !canAddForeignKey"
                    >
                      Add Foreign Key
                    </UButton>
                  </div>

                  <div
                    v-if="foreignKeys.length === 0"
                    class="text-sm text-gray-500 text-center py-4 border rounded-md"
                  >
                    No foreign keys added yet. Click "Add Foreign Key" to add one.
                  </div>
                  <div v-else class="space-y-3">
                    <div v-for="(fk, i) in foreignKeys" :key="i" class="border rounded-md">
                      <UCollapsible v-model:open="foreignKeyCollapsibleState[i]" class="w-full">
                        <div class="flex items-center w-full">
                          <UButton
                            class="group flex-1 flex items-center justify-between p-3 text-left"
                            color="neutral"
                            variant="ghost"
                            :trailing-icon="'i-lucide-settings-2'"
                            :ui="{
                              trailingIcon:
                                'group-data-[state=open]:rotate-90 transition-transform duration-200',
                            }"
                          >
                            <div class="flex flex-1 items-center justify-between">
                              <!-- <div class="font-medium truncate max-w-[180px]">
                                Foreign Key {{ i + 1 }}
                              </div> -->
                              <div class="text-xs text-gray-500 mr-2">
                                {{ fk.column }} → {{ fk.on }}.{{ fk.references }}
                              </div>
                            </div>
                          </UButton>
                          <UButton
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            size="sm"
                            class="mr-2"
                            @click="removeForeignKey(i)"
                            :disabled="isSubmitting"
                          />
                        </div>
                        <template #content>
                          <div class="p-3 pt-0">
                            <div class="space-y-3">
                              <UFormField label="Column">
                                <USelect
                                  v-model="fk.column"
                                  :items="
                                    columns.map((col: any) => ({
                                      label: col.name,
                                      value: col.name,
                                    }))
                                  "
                                  :disabled="isSubmitting || columns.length === 0"
                                  class="w-full"
                                />
                              </UFormField>
                              <UFormField label="References Table">
                                <USelect
                                  v-model="fk.on"
                                  :items="tableOptions"
                                  placeholder="Select referenced table"
                                  :disabled="isSubmitting || tableOptions.length === 0"
                                  class="w-full"
                                  @update:model-value="onReferenceTableChange($event, i)"
                                />
                              </UFormField>
                              <UFormField label="References Column">
                                <USelect
                                  v-model="fk.references"
                                  :items="referencedTableColumns[fk.on]?.columns || []"
                                  :loading="referencedTableColumns[fk.on]?.isLoading"
                                  :disabled="isSubmitting || !fk.on"
                                  :placeholder="!fk.on ? 'Select table first' : 'Select column'"
                                  loading-icon="i-lucide-loader-2"
                                  class="w-full"
                                >
                                </USelect>
                              </UFormField>
                            </div>
                          </div>
                        </template>
                      </UCollapsible>
                    </div>
                  </div>
                </div>
              </template>
            </UTabs>
          </div>
        </form>
      </div>
    </template>

    <!-- Slideover Footer -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="soft"
          @click="handleClose"
          :disabled="isSubmitting"
          label="Cancel"
        />
        <UButton
          type="button"
          color="primary"
          :loading="isSubmitting"
          :disabled="!isValid || isSubmitting"
          @click="handleSubmit"
          label="Create Table"
        />
      </div>
    </template>
  </USlideover>
</template>
