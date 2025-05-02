<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { computed, h, ref, resolveComponent, useTemplateRef, watch } from 'vue'

const UCheckbox = resolveComponent('UCheckbox')
const rowSelection = ref({})
const table = useTemplateRef('table')
const props = defineProps({
  tableName: {
    type: String,
    default: '',
  },
  tableData: {
    type: Array as () => any[],
    default: () => [],
    required: true,
  },
  columns: {
    type: Array as () => any[],
    default: () => [],
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  pageSize: {
    type: String,
    default: '25',
  },
  totalItems: {
    type: Number,
    default: 0,
  },
  initialPage: {
    type: Number,
    default: 1,
  },
  maxContentLength: {
    type: Number,
    default: 30,
  },
  visibleColumns: {
    type: Array as () => string[],
    default: () => [],
  },
  hiddenColumns: {
    type: Array as () => string[],
    default: () => [],
  },
})

const emit = defineEmits([
  'refresh-data',
  'update:page',
  'update:page-size',
  'onDelete',
  'onShowEdit',
])
// Create pagination state
const pagination = ref({
  pageIndex: props.initialPage - 1,
  pageSize: props.pageSize,
})
const columnPinning = ref({
  left: [],
  right: ['action'],
})

const rowsPerPageOptions = ref(['25', '50', '100'])
const selectedPageSize = ref(props.pageSize)
const showDelete = ref(false)
const showEditTableSlideover = ref(false)

// Helper function to check if a field should be masked for security
function isSensitiveField(key: any) {
  // Specific exemptions for fields that shouldn't be masked despite containing sensitive patterns
  const exemptFields = ['last_token_refresh']
  if (exemptFields.includes(key)) {
    return false
  }

  const sensitivePatterns = ['password', 'token', 'secret', 'key', 'hash', 'salt']
  return sensitivePatterns.some((pattern) => key.toLowerCase().includes(pattern))
}

// Helper function to check if a field likely contains date values
function isDateField(key: any, value: any) {
  const datePatterns = [
    '_at',
    '_date',
    '_time',
    '_on',
    'date_',
    'time_',
    // 'created',
    'updated',
    'deleted',
    'timestamp',
  ]

  const hasDatePattern = datePatterns.some((pattern) => key.toLowerCase().includes(pattern))

  if (typeof value === 'string') {
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T|\s)\d{2}:\d{2}:\d{2}/
    return hasDatePattern || dateRegex.test(value)
  }

  return hasDatePattern
}

// Helper function to check if a field likely contains status values
function isStatusField(key: any, value: any) {
  return (
    key === 'status' ||
    key.endsWith('_status') ||
    (typeof value === 'string' &&
      ['active', 'inactive', 'pending', 'completed', 'failed', 'suspended'].includes(
        value.toLowerCase(),
      ))
  )
}

// Helper function to truncate long text
function truncateText(text: any, maxLength: any) {
  if (typeof text !== 'string') return text

  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

// Define dynamic columns based on the first record in the tableData
const columns = computed<TableColumn<any>[]>(() => {
  // if (!props.tableData || props.tableData.length === 0) return []

  // Use the first record to determine columns
  // const sampleRecord = props.tableData[0]

  // Start with selection column
  const allColumns: TableColumn<any>[] = [
    {
      id: 'select',
      header: ({ table }) =>
        h(UCheckbox, {
          modelValue: table.getIsSomePageRowsSelected()
            ? 'indeterminate'
            : table.getIsAllPageRowsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') =>
            table.toggleAllPageRowsSelected(!!value),
          ariaLabel: 'Select all',
        }),
      cell: ({ row }) =>
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          ariaLabel: 'Select row',
        }),
    },
  ]
  //
  // Add data columns
  // const dataColumns = props.columns.map((column) => {})
  const dataColumns = props.columns.map((column) => {
    return {
      accessorKey: column.name,
      header: column.name,
      cell: ({ row }: any) => {
        const value = row.getValue(column.name)
        const columnName = column.name
        // const columnType = column.type;

        // Handle sensitive fields (like passwords)
        if (isSensitiveField(columnName)) {
          return '••••••••'
        }

        // Format date fields
        if (isDateField(columnName, value)) {
          // return value
          //   ? new Date(value).toLocaleString('en-US', {
          //       day: 'numeric',
          //       month: 'short',
          //       year: 'numeric',
          //       hour: '2-digit',
          //       minute: '2-digit',
          //       hour12: false,
          //     })
          //   : '—'
        }

        // Handle boolean or status values
        if (isStatusField(columnName, value)) {
          const statusMap = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800',
            suspended: 'bg-red-100 text-red-800',
            completed: 'bg-blue-100 text-blue-800',
            failed: 'bg-red-100 text-red-800',
          }
          const lowercaseValue = typeof value === 'string' ? value.toLowerCase() : ''
          const statusClass =
            statusMap[lowercaseValue as keyof typeof statusMap] || 'bg-gray-100 text-gray-800'

          return h(
            'span',
            {
              class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass}`,
            },
            value,
          )
        }

        // Handle boolean values
        if (typeof value === 'boolean') {
          return value
            ? h('span', { class: 'text-green-600' }, 'Yes')
            : h('span', { class: 'text-red-600' }, 'No')
        }

        // Handle null values
        if (value === null) {
          return '—'
        }

        // For string values, truncate if too long and add a tooltip
        if (typeof value === 'string' && value.length > props.maxContentLength) {
          return h(
            'div',
            {
              class: 'truncate max-w-xs',
              title: value, // Add full text as tooltip
            },
            truncateText(value, props.maxContentLength),
          )
        }

        return value
      },
    }
  })

  // Filter columns based on visibleColumns and hiddenColumns props
  let finalColumns = [...dataColumns]

  // If visibleColumns is provided and not empty, only show those columns
  if (props.visibleColumns && props.visibleColumns.length > 0) {
    finalColumns = finalColumns.filter((column) => {
      const key = column.accessorKey as string
      return props.visibleColumns.includes(key)
    })
  }

  // If hiddenColumns is provided, hide those columns
  if (props.hiddenColumns && props.hiddenColumns.length > 0) {
    finalColumns = finalColumns.filter((column) => {
      const key = column.accessorKey as string
      return !props.hiddenColumns.includes(key)
    })
  }

  // Add enableHiding attribute to all columns for column visibility toggle
  finalColumns = finalColumns.map((column) => ({
    ...column,
    enableHiding: true,
  }))

  const actionColumns: TableColumn<any>[] = [
    {
      id: 'action',
    },
  ]

  // Combine selection column with filtered data columns
  return [...allColumns, ...finalColumns, ...actionColumns]
})

// function upperFirst(str: string) {
//   return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
// }
function onDelete() {
  const selectedRows = table.value?.tableApi
    ?.getSelectedRowModel()
    ?.rows.map((row) => row.original)
    .filter((row) => row !== undefined)
  console.log('Selected rows for deletion:', selectedRows)
  emit('onDelete', selectedRows)
}

function onShowEdit(row: any) {
  console.log('Selected rows for edit:', row)
  emit('onShowEdit', row)
}

function onShowEditColumns() {
  showEditTableSlideover.value = true
}

watch(
  () => selectedPageSize.value,
  (newPageSize) => {
    pagination.value.pageSize = newPageSize
    console.log('Page size changed:', newPageSize)
    emit('update:page-size', newPageSize)
  },
)

watch(
  () => rowSelection.value,
  (newRowSelection) => {
    showDelete.value = Object.keys(newRowSelection).length > 0
  },
)

const handleUpdateSchema = async (schema: any) => {
  emit('refresh-data', schema)
}
</script>
<template>
  <div class="flex flex-col h-full">
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <div>
        <UButton variant="outline" icon="i-lucide-table-properties" @click="onShowEditColumns()" />
      </div>
      <div>
        <UButton
          v-if="showDelete"
          color="error"
          variant="outline"
          icon="i-tabler-trash"
          @click="onDelete"
        />
        <UDropdownMenu
          :items="
            table?.tableApi
              ?.getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => ({
                label: column.id,
                type: 'checkbox' as const,
                checked: column.getIsVisible(),
                onUpdateChecked(checked: boolean) {
                  table?.tableApi?.getColumn(column.id)?.toggleVisibility(!!checked)
                },
                onSelect(e?: Event) {
                  e?.preventDefault()
                },
              }))
          "
          :content="{ align: 'end' }"
        >
          <UButton
            label="Columns"
            color="neutral"
            variant="outline"
            trailing-icon="i-lucide-chevron-down"
          />
        </UDropdownMenu>
      </div>
    </div>
    <div class="flex-grow overflow-auto">
      <UTable
        ref="table"
        :loading="props.isLoading"
        sticky
        v-model:row-selection="rowSelection"
        v-model:column-pinning="columnPinning"
        :data="props.tableData"
        :columns="columns"
        hover
        class="min-h-96"
        :pagination="pagination"
        :pagination-options="{
          manualPagination: true,
        }"
        :ui="{
          th: 'px-4 py-3.5 text-sm text-highlighted text-left rtl:text-right font-semibold whitespace-nowrap [&:has([role=checkbox])]:pe-0',
        }"
      >
        <template #empty>
          <slot name="empty" />
        </template>
        <template #action-cell="{ row }">
          <UButton
            icon="i-tabler-arrow-right"
            color="neutral"
            variant="ghost"
            aria-label="Actions"
            @click="onShowEdit(row.original)"
          />
        </template>
      </UTable>
    </div>
    <!-- Pagination section -->
    <div
      class="flex border-t border-gray-200 dark:border-gray-700 mt-4 pt-4 sticky bottom-0 justify-between"
      v-if="props.tableData.length > 0"
    >
      <div>
        {{ pagination.pageIndex * Number(pagination.pageSize) + 1 }} to
        {{ Math.min((pagination.pageIndex + 1) * Number(pagination.pageSize), props.totalItems) }}
        of
        {{ props.totalItems }}
      </div>
      <div class="flex">
        <UPagination
          :default-page="pagination.pageIndex + 1"
          :page="pagination.pageIndex + 1"
          :items-per-page="Number(pagination.pageSize)"
          :total="props.totalItems"
          @update:page="
            (p: number) => {
              console.log('Page:', p)
              pagination.pageIndex = p - 1
              emit('update:page', pagination)
            }
          "
          class="mr-3"
        />
        <USelect v-model="selectedPageSize" :items="rowsPerPageOptions" class="w-20" />
      </div>
    </div>
  </div>

  <EditTableSlideover
    v-model:open="showEditTableSlideover"
    slideoverTitle="Edit Table"
    :columnData="props.columns"
    :tableName="props.tableName"
    @submit="handleUpdateSchema"
  />
</template>
