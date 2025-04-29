<script setup lang="ts">
import { ref, computed } from 'vue'

// Define column interface
interface TableColumn {
  name: string
  type: string
  length: string | null
  nullable: boolean
  primary: boolean
}

interface TableData {
  name: string
  columns: TableColumn[]
}

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

// Create a computed property for two-way binding of open state
const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

// Form state
const tableName = ref('')
const columns = ref<TableColumn[]>([])
const isSubmitting = ref(false)

// Column types
const columnTypes = ref([
  'bigInteger',
  'binary',
  'blob',
  'boolean',
  'char',
  'date',
  'dateTime',
  'decimal',
  'double',
  'enum',
  'float',
  'geometry',
  'integer',
  'ipAddress',
  'json',
  'jsonb',
  'longText',
  'macAddress',
  'mediumInteger',
  'mediumText',
  'smallInteger',
  'string',
  'text',
  'time',
  'timestamp',
  'tinyInteger',
  'tinyText',
  'uuid',
  'varchar',
  'varbinary',
  'year',
])

// Computed properties
const isValid = computed(() => {
  return (
    tableName.value.trim() !== '' &&
    columns.value.length > 0 &&
    columns.value.every((col) => col.name.trim() !== '')
  )
})

const hasPrimaryKey = computed(() => {
  return columns.value.some((col) => col.primary)
})

// Methods
function addColumn() {
  columns.value.push({
    name: '',
    type: 'string',
    length: '255', // Default length for string columns
    nullable: true,
    primary: columns.value.length === 0, // Make first column primary by default
  })
}

function removeColumn(index: number) {
  columns.value.splice(index, 1)
}

function handleClose() {
  isOpen.value = false
  emit('close')

  // Reset form
  setTimeout(() => {
    tableName.value = ''
    columns.value = []
  }, 100)
}

function handleSubmit() {
  if (!isValid.value) return

  isSubmitting.value = true

  // Prepare data for submission
  const tableData: TableData = {
    name: tableName.value.trim(),
    columns: columns.value.map((col) => ({
      name: col.name.trim(),
      type: col.type,
      length: needsLength(col.type) ? col.length : null,
      nullable: col.nullable,
      primary: col.primary,
    })),
  }

  // Emit submit event with table data
  emit('submit', tableData)

  // In a real implementation, you might want to wait for API response before closing
  setTimeout(() => {
    isSubmitting.value = false
    handleClose()
  }, 500)
}

// Helper to determine if a column type needs length specification
function needsLength(type: string): boolean {
  return [
    'varchar',
    'char',
    'binary',
    'varbinary',
    'decimal',
    'float',
    'double',
    'tinyText',
    'smallInteger',
    'mediumInteger',
    'tinyInteger',
  ].includes(type)
}
</script>
<template>
  <USlideover v-model:open="isOpen" :title="slideoverTitle" side="right">
    <template #body>
      <div class="space-y-4">
        <form @submit.prevent="handleSubmit">
          <!-- Table Name Input -->
          <UFormField label="Table Name" name="tableName" required>
            <UInput
              v-model="tableName"
              placeholder="Enter table name"
              :disabled="isSubmitting"
              autofocus
              class="w-full"
            />
          </UFormField>

          <!-- Columns Section -->
          <div class="mt-6">
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

            <div v-else class="space-y-3">
              <div
                v-for="(column, index) in columns"
                :key="index"
                class="flex items-start gap-2 p-3 border rounded-md"
              >
                <div class="flex-1">
                  <UFormField label="Column Name" class="mb-4">
                    <UInput
                      v-model="column.name"
                      placeholder="Column name"
                      :disabled="isSubmitting"
                      class="w-full"
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
                        v-model="column.length"
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
                      v-model="column.nullable"
                      label="Nullable"
                      :disabled="isSubmitting"
                    />
                    <UCheckbox
                      v-model="column.primary"
                      label="Primary"
                      :disabled="isSubmitting || (hasPrimaryKey && !column.primary)"
                    />
                  </div>
                </div>
                <UButton
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  size="sm"
                  class="mt-1"
                  @click="removeColumn(index)"
                  :disabled="isSubmitting"
                />
              </div>
            </div>
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
          @click="isOpen = false"
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
