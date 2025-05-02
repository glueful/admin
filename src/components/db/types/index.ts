// Define column interface
export interface TableColumn {
  name: string
  type: string
  options: {
    length?: number | string | null
    nullable?: boolean
    primary?: boolean
    autoIncrement?: boolean
    unique?: boolean
    default?: any
  }
  nameError?: string | undefined
  disabled?: boolean // Flag to indicate if column is existing and shouldn't be edited
  deleted?: boolean // Flag to indicate if column is marked for deletion
}

// Define index interface
export interface TableIndex {
  type: 'INDEX' | 'UNIQUE'
  column: string
  disabled?: boolean // Flag to indicate if index is existing and shouldn't be edited
  deleted?: boolean // Flag to indicate if index is marked for deletion
}

// Define foreign key interface
export interface TableForeignKey {
  column: string
  references: string
  on: string
  isLoadingColumns?: boolean
  disabled?: boolean // Flag to indicate if foreign key is existing and shouldn't be edited
  deleted?: boolean // Flag to indicate if foreign key is marked for deletion
}

// Define a structure to hold column data for referenced tables
export interface ReferencedTableColumns {
  [tableName: string]: {
    columns: { label: string; value: string }[]
    isLoading: boolean
    error?: string
  }
}

export interface TableData {
  name: string
  columns: TableColumn[]
  indexes: TableIndex[]
  foreignKeys: TableForeignKey[]
}

// API request format for creating a table
export interface CreateTableRequest {
  table_name: string
  columns: Array<{
    name: string
    type: string
    options: {
      nullable?: string
      primary?: string
      autoIncrement?: string | boolean
      default?: any
    }
  }>
  indexes?: Array<{
    type: 'INDEX' | 'UNIQUE'
    column: string
  }>
  foreign_keys?: Array<{
    column: string
    references: string
    on: string
  }>
  deleted_columns?: string[] // Track columns that should be removed
  deleted_indexes?: string[]
  deleted_foreign_keys?: string[]
}
