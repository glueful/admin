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
import {
  reservedKeywords,
  columnTypes,
  formatDatabaseName,
  needsLength,
  canAutoIncrement,
  getAutoIncrementValue,
  currentDbEngine,
} from './db'
import { useToastNotification } from '@/composables/useToastNotification'

// Props and emits definition
const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  submitting: {
    type: Boolean,
    default: false,
  },
  slideoverTitle: {
    type: String,
    default: 'Edit Table',
  },
  columnData: {
    type: Array,
    default: () => [],
  },
  tableName: {
    type: String,
    default: '',
  },
})

const toast = useToastNotification()

// Compute the full slideover title with database engine
const fullSlideoverTitle = computed(() => {
  return `${props.slideoverTitle} | ${currentDbEngine.value.toUpperCase()}`
})

const emit = defineEmits(['update:open', 'close', 'submit', 'update:submitting'])

// Get the store for table operations
const dbTablesStore = useDBTablesStore()

// Create a computed property for two-way binding of open state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

// Create a computed property for two-way binding of submitting state
const isSubmitting = computed({
  get: () => props.submitting,
  set: (value) => emit('update:submitting', value),
})

// Form state
const tableName = ref(props.tableName || '')
const tableNameError = ref<string | undefined>(undefined)
const columns = ref<TableColumn[]>([])
const indexes = ref<TableIndex[]>([])
const foreignKeys = ref<TableForeignKey[]>([])
// Track collapsible state for each column
const collapsibleState = ref<Record<number, boolean>>({})
// Track collapsible state for indexes
const indexCollapsibleState = ref<Record<number, boolean>>({})
// Track collapsible state for foreign keys
const foreignKeyCollapsibleState = ref<Record<number, boolean>>({})

// Track deleted existing items
const deletedColumns = ref<string[]>([])
const deletedIndexes = ref<string[]>([])
const deletedForeignKeys = ref<string[]>([])

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
  if (!name.trim()) {
    return `Table name is required`
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return `Table name must start with letter or underscore and contain only letters, numbers, and underscores`
  }

  if (reservedKeywords.includes(name.toLowerCase())) {
    return `Table name cannot be a reserved SQL keyword`
  }

  // Skip duplicate validation if it's the same as the original table name
  if (props.tableName && name.toLowerCase() === props.tableName.toLowerCase()) {
    return undefined
  }

  // For table names, check if it already exists in the database
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

  return undefined
}

// Function to parse and extract column data from the provided structure
function processColumnData() {
  // Don't process if no data is available
  if (!props.columnData || props.columnData.length === 0) return

  // Clear existing data
  columns.value = []
  indexes.value = []
  foreignKeys.value = []

  // Process columns and extract indexes
  const uniqueIndexes = new Map()

  props.columnData.forEach((col: any, idx: number) => {
    // Extract column type and length from format like "varchar(255)"
    let type = col.type
    let length: string | null = null
    const typeMatch = col.type.match(/([a-zA-Z]+)\(([^)]+)\)/)

    if (typeMatch) {
      type = typeMatch[1].toUpperCase() // e.g., "VARCHAR"
      length = typeMatch[2] // e.g., "255"
    }

    // Convert to internal column format
    const column: TableColumn = {
      name: col.name,
      type: type.toUpperCase(),
      options: {
        length: length,
        nullable: col.nullable,
        primary: col.is_primary,
        autoIncrement: col.extra?.includes('auto_increment'),
        default: col.default,
      },
      nameError: undefined,
      // Add disabled flag to mark this as an existing column that shouldn't be edited
      disabled: true,
      deleted: false, // Initialize deleted state as false
    }

    // Add the column
    columns.value.push(column)

    // Set default collapse state
    collapsibleState.value[idx] = false

    // Process indexes
    if (col.indexes && col.indexes.length > 0) {
      col.indexes.forEach((idx: any) => {
        // Skip PRIMARY KEY indexes entirely since they're handled by the column's primary flag
        if (idx.name === 'PRIMARY' || idx.type === 'PRIMARY KEY') return

        // For non-primary indexes, use the name as the key to avoid duplicates
        const indexKey = idx.name

        if (!uniqueIndexes.has(indexKey)) {
          let indexType = 'INDEX'

          if (idx.type === 'UNIQUE') {
            indexType = 'UNIQUE'
          }

          uniqueIndexes.set(indexKey, {
            type: indexType,
            column: col.name,
            name: idx.name,
          })
        }
      })
    }

    // Process foreign keys if present (in the relationships array)
    if (col.relationships && col.relationships.length > 0) {
      col.relationships.forEach((rel: any) => {
        // console.log('Processing relationship:', rel)

        const foreignKey = {
          column: rel.column,
          references: rel.references_column || 'id',
          on: rel.references_table || '',
          // Store additional properties for potential future use
          constraint: rel.constraint,
          on_update: rel.on_update,
          on_delete: rel.on_delete,
          disabled: true, // Mark existing foreign keys as disabled
        }

        foreignKeys.value.push(foreignKey)

        // Fetch columns for this referenced table to populate the dropdown
        if (rel.references_table) {
          fetchTableColumns(rel.references_table)
        }
      })
    }
  })

  // Convert indexes map to array and add to indexes value
  uniqueIndexes.forEach((index) => {
    indexes.value.push({
      type: index.type === 'PRIMARY KEY' ? 'PRIMARY KEY' : index.type,
      column: index.column,
      disabled: true, // Mark existing indexes as disabled
    })
  })
}

// Methods
function addColumn() {
  const index = columns.value.length
  const isPrimary = columns.value.length === 0 // Make first column primary by default

  columns.value.push({
    name: '',
    type: 'INT', // Use INT type instead of 'string' which is not a real database type
    options: {
      length: '11',
      nullable: !isPrimary, // Primary keys should not be nullable
      primary: isPrimary,
      autoIncrement: isPrimary, // Enable auto-increment by default for primary keys
    },
    nameError: undefined,
  })
  // Set default open state for the new column
  collapsibleState.value[index] = true
}

function removeColumn(index: number) {
  const column = columns.value[index]

  // Instead of removing the column, mark it as deleted
  if (column.disabled && column.name) {
    // For existing columns, track deletion for API purposes
    deletedColumns.value.push(column.name)
  }

  // Mark as deleted instead of removing
  columns.value[index].deleted = true
}

function restoreColumn(index: number) {
  const column = columns.value[index]

  // Remove from deleted columns tracking if it was an existing column
  if (column.disabled && column.name) {
    const idx = deletedColumns.value.indexOf(column.name)
    if (idx !== -1) {
      deletedColumns.value.splice(idx, 1)
    }
  }

  // Mark as not deleted
  columns.value[index].deleted = false
}

// Manage indexes
function addIndex() {
  indexes.value.push({
    type: 'INDEX',
    column: columns.value.length > 0 ? columns.value[0].name : '',
  })
}

function removeIndex(index: number) {
  const idx = indexes.value[index]

  // If this is an existing index, add it to the deleted indexes tracking array
  if (idx.disabled && idx.column) {
    deletedIndexes.value.push(idx.column)
  }

  // Mark as deleted instead of removing
  indexes.value[index].deleted = true
}

function restoreIndex(index: number) {
  const idx = indexes.value[index]

  // Remove from deleted indexes tracking if it was an existing index
  if (idx.disabled && idx.column) {
    const deleteIdx = deletedIndexes.value.indexOf(idx.column)
    if (deleteIdx !== -1) {
      deletedIndexes.value.splice(deleteIdx, 1)
    }
  }

  // Mark as not deleted
  indexes.value[index].deleted = false
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
  const fk: any = foreignKeys.value[index]

  // If this is an existing foreign key, add it to the deleted foreign keys tracking array
  if (fk.disabled && fk.constraint) {
    deletedForeignKeys.value.push(fk.constraint)
  }

  // Mark as deleted instead of removing
  foreignKeys.value[index].deleted = true
}

function restoreForeignKey(index: number) {
  const fk: any = foreignKeys.value[index]

  // Remove from deleted foreign keys tracking if it was an existing foreign key
  if (fk.disabled && fk.constraint) {
    const idx = deletedForeignKeys.value.indexOf(fk.constraint)
    if (idx !== -1) {
      deletedForeignKeys.value.splice(idx, 1)
    }
  }

  // Mark as not deleted
  foreignKeys.value[index].deleted = false
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

async function handleSubmit() {
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
    columns: columns.value
      .filter((col) => !col.disabled && !col.deleted) // Exclude existing and deleted columns
      .map((col: TableColumn) => {
        // Format type with length if needed
        let formattedType = col.type
        if (needsLength(col.type) && col.options.length) {
          formattedType = `${col.type}(${col.options.length})`
        }

        // Get the appropriate autoIncrement value if applicable
        const autoIncrementValue =
          col.options.autoIncrement && canAutoIncrement(col.type)
            ? getAutoIncrementValue()
            : undefined

        return {
          name: col.name.trim(),
          type: formattedType,
          options: {
            // Convert boolean nullable value to SQL constraint string
            nullable: col.options.nullable ? 'NULL' : 'NOT NULL',
            // Convert boolean primary key value to SQL constraint string
            primary: col.options.primary ? 'PRIMARY KEY' : undefined,
            // Convert boolean autoIncrement to SQL string value
            autoIncrement: autoIncrementValue,
            // Only include default if it has a value
            default: col.options.default || undefined,
          },
        }
      }),
  }

  // Add indexes if any exist
  if (indexes.value.length > 0) {
    // Filter out any indexes that don't have column names and exclude existing ones
    const validIndexes = indexes.value.filter((index) => index.column && !index.disabled)

    if (validIndexes.length > 0) {
      createTableRequest.indexes = validIndexes.map((index) => ({
        type: index.type,
        column: index.column,
      }))
    }
  }

  // Add foreign keys if any exist
  if (foreignKeys.value.length > 0) {
    // Filter out any foreign keys that don't have complete information and exclude existing ones
    const validForeignKeys = foreignKeys.value.filter(
      (fk) => fk.column && fk.references && fk.on && !fk.disabled,
    )

    if (validForeignKeys.length > 0) {
      createTableRequest.foreign_keys = validForeignKeys.map((fk) => ({
        column: fk.column,
        references: fk.references,
        on: fk.on,
      }))
    }
  }

  // Add deleted items to the request
  if (deletedColumns.value.length > 0) {
    createTableRequest.deleted_columns = deletedColumns.value
  }

  if (deletedIndexes.value.length > 0) {
    createTableRequest.deleted_indexes = deletedIndexes.value
  }

  if (deletedForeignKeys.value.length > 0) {
    createTableRequest.deleted_foreign_keys = deletedForeignKeys.value
  }

  console.log('Update Table Request:', createTableRequest)
  // Emit submit event with table data

  try {
    const response = await dbTablesStore.updateTableSchema(createTableRequest)
    if (response.success) {
      // Show success notification
    } else {
      throw new Error('Failed to update table schema')
    }
    emit('submit', response)
  } catch (error: any) {
    toast.error({
      title: 'Update Failed',
      description: error.message || 'Failed to update table. Please try again.',
    })
    console.error('Error updating table schema:', error)
    // Handle error appropriately, e.g., show a notification
  }
  isSubmitting.value = false
  handleClose()
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
    // Set the table name from props
    tableName.value = props.tableName || ''

    if (props.columnData && props.columnData.length > 0) {
      // Process the incoming column data to populate the form when editing
      processColumnData()
    }
  }
})

watch(isSubmitting, (newSubmitting) => {
  emit('update:submitting', newSubmitting)
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

  // console.debug('Fetching columns for table:', tableName)

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
    // console.debug('API Response for columns:', response)

    // Get the columns from the response
    const columnsData = response ? response.columns || response : []
    // console.log('Column data:', columnsData)

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

    // console.log('Processed columns for UI:', referencedTableColumns.value[tableName].columns)
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
    :title="fullSlideoverTitle"
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
              :disabled="true"
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
                    <div
                      v-for="(column, index) in columns"
                      :key="index"
                      class="border rounded-md"
                      :class="{ 'border-gray-300': column.deleted }"
                    >
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
                            :class="{ 'opacity-60': column.deleted }"
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
                                <span v-if="column.disabled" class="ml-1 text-xs text-amber-600"
                                  >(existing)</span
                                >
                                <span v-if="column.deleted" class="ml-1 text-xs text-red-600"
                                  >(deleted)</span
                                >
                              </div>
                              <div class="text-xs text-gray-500 mr-2">
                                {{ column.type
                                }}{{ needsLength(column.type) ? `(${column.options.length})` : '' }}
                                {{ column.options.primary ? '• Primary' : '' }}
                                {{ column.options.nullable ? '• Nullable' : '• NOT NULL' }}
                              </div>
                            </div>
                          </UButton>
                          <!-- Show delete or restore button based on column status -->
                          <UButton
                            v-if="!column.deleted"
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            size="sm"
                            class="mr-2"
                            @click.stop="removeColumn(index)"
                            :disabled="isSubmitting"
                          />
                          <UButton
                            v-else
                            color="success"
                            variant="ghost"
                            icon="i-tabler-restore"
                            size="sm"
                            class="mr-2"
                            @click.stop="restoreColumn(index)"
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
                                  :disabled="isSubmitting || column.disabled || column.deleted"
                                  class="w-full"
                                  :status="column.nameError ? 'error' : undefined"
                                  :class="{
                                    'bg-gray-100 dark:bg-gray-800':
                                      column.disabled || column.deleted,
                                  }"
                                />
                              </UFormField>
                              <div class="grid grid-cols-2 gap-4 mb-4">
                                <UFormField label="Type">
                                  <USelect
                                    v-model="column.type"
                                    :items="columnTypes"
                                    :disabled="isSubmitting || column.disabled || column.deleted"
                                    placeholder="Select type"
                                    class="w-full"
                                    :class="{
                                      'bg-gray-100 dark:bg-gray-800':
                                        column.disabled || column.deleted,
                                    }"
                                  />
                                </UFormField>
                                <UFormField label="Length">
                                  <UInput
                                    v-model="column.options.length"
                                    placeholder="255"
                                    type="number"
                                    min="1"
                                    :disabled="
                                      isSubmitting ||
                                      !needsLength(column.type) ||
                                      column.disabled ||
                                      column.deleted
                                    "
                                    class="w-full"
                                    :class="{
                                      'bg-gray-100 dark:bg-gray-800':
                                        column.disabled || column.deleted,
                                    }"
                                  />
                                </UFormField>
                              </div>
                              <div class="flex flex-wrap gap-4">
                                <UCheckbox
                                  v-model="column.options.nullable"
                                  label="Nullable"
                                  :disabled="isSubmitting || column.disabled || column.deleted"
                                />
                                <UCheckbox
                                  v-model="column.options.primary"
                                  label="Primary"
                                  :disabled="
                                    isSubmitting ||
                                    (hasPrimaryKey && !column.options.primary) ||
                                    column.disabled ||
                                    column.deleted
                                  "
                                />
                                <UCheckbox
                                  v-model="column.options.autoIncrement"
                                  label="Auto Increment"
                                  :disabled="
                                    isSubmitting ||
                                    !column.options.primary ||
                                    !canAutoIncrement(column.type) ||
                                    column.disabled ||
                                    column.deleted
                                  "
                                />
                              </div>
                            </div>
                            <UFormField label="Default Value" class="mt-4">
                              <UInput
                                v-model="column.options.default"
                                placeholder="Default value"
                                :disabled="isSubmitting || column.disabled || column.deleted"
                                class="w-full"
                                :class="{
                                  'bg-gray-100 dark:bg-gray-800': column.disabled || column.deleted,
                                }"
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
                    <div
                      v-for="(index, i) in indexes"
                      :key="i"
                      class="border rounded-md"
                      :class="{ 'border-gray-300': index.deleted }"
                    >
                      <UCollapsible v-model:open="indexCollapsibleState[i]" class="w-full">
                        <div class="flex items-center w-full">
                          <UButton
                            class="group flex-1 flex items-center justify-between p-3 text-left"
                            :class="{ 'opacity-60': index.deleted }"
                            color="neutral"
                            variant="ghost"
                            :trailing-icon="'i-lucide-settings-2'"
                            :ui="{
                              trailingIcon:
                                'group-data-[state=open]:rotate-90 transition-transform duration-200',
                            }"
                          >
                            <div class="flex flex-1 items-center justify-between">
                              <div class="text-xs text-gray-500 mr-2">
                                {{ index.type }} on {{ index.column }}
                                <span v-if="index.disabled" class="ml-1 text-xs text-amber-600"
                                  >(existing)</span
                                >
                                <span v-if="index.deleted" class="ml-1 text-xs text-red-600"
                                  >(deleted)</span
                                >
                              </div>
                            </div>
                          </UButton>
                          <UButton
                            v-if="!index.deleted"
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            size="sm"
                            class="mr-2"
                            @click.stop="removeIndex(i)"
                            :disabled="isSubmitting"
                          />
                          <UButton
                            v-else
                            color="success"
                            variant="ghost"
                            icon="i-tabler-restore"
                            size="sm"
                            class="mr-2"
                            @click.stop="restoreIndex(i)"
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
                                    :disabled="isSubmitting || index.disabled"
                                    class="w-full"
                                    :class="{ 'bg-gray-100 dark:bg-gray-800': index.disabled }"
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
                                    :disabled="
                                      isSubmitting || columns.length === 0 || index.disabled
                                    "
                                    class="w-full"
                                    :class="{ 'bg-gray-100 dark:bg-gray-800': index.disabled }"
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
                    <div
                      v-for="(fk, i) in foreignKeys"
                      :key="i"
                      class="border rounded-md"
                      :class="{ 'border-gray-300': fk.deleted }"
                    >
                      <UCollapsible v-model:open="foreignKeyCollapsibleState[i]" class="w-full">
                        <div class="flex items-center w-full">
                          <UButton
                            class="group flex-1 flex items-center justify-between p-3 text-left"
                            :class="{ 'opacity-60': fk.deleted }"
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
                                <span v-if="fk.disabled" class="ml-1 text-xs text-amber-600"
                                  >(existing)</span
                                >
                                <span v-if="fk.deleted" class="ml-1 text-xs text-red-600"
                                  >(deleted)</span
                                >
                              </div>
                            </div>
                          </UButton>
                          <UButton
                            v-if="!fk.deleted"
                            color="error"
                            variant="ghost"
                            icon="i-lucide-trash-2"
                            size="sm"
                            class="mr-2"
                            @click.stop="removeForeignKey(i)"
                            :disabled="isSubmitting"
                          />
                          <UButton
                            v-else
                            color="success"
                            variant="ghost"
                            icon="i-tabler-restore"
                            size="sm"
                            class="mr-2"
                            @click.stop="restoreForeignKey(i)"
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
                                  :disabled="isSubmitting || columns.length === 0 || fk.disabled"
                                  class="w-full"
                                  :class="{ 'bg-gray-100 dark:bg-gray-800': fk.disabled }"
                                />
                              </UFormField>
                              <UFormField label="References Table">
                                <USelect
                                  v-model="fk.on"
                                  :items="tableOptions"
                                  placeholder="Select referenced table"
                                  :disabled="
                                    isSubmitting || tableOptions.length === 0 || fk.disabled
                                  "
                                  class="w-full"
                                  :class="{ 'bg-gray-100 dark:bg-gray-800': fk.disabled }"
                                  @update:model-value="onReferenceTableChange($event, i)"
                                />
                              </UFormField>
                              <UFormField label="References Column">
                                <USelect
                                  v-model="fk.references"
                                  :items="referencedTableColumns[fk.on]?.columns || []"
                                  :loading="referencedTableColumns[fk.on]?.isLoading"
                                  :disabled="isSubmitting || !fk.on || fk.disabled"
                                  :placeholder="!fk.on ? 'Select table first' : 'Select column'"
                                  loading-icon="i-lucide-loader-2"
                                  class="w-full"
                                  :class="{ 'bg-gray-100 dark:bg-gray-800': fk.disabled }"
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
          label="Save Changes"
        />
      </div>
    </template>
  </USlideover>
</template>
