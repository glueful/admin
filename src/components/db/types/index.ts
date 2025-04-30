// Define column interface
export interface TableColumn {
  name: string
  type: string
  length: string | null
  nullable: boolean
  primary: boolean
  nameError?: string | undefined
}

// Define index interface
export interface TableIndex {
  type: 'INDEX' | 'UNIQUE'
  column: string
}

// Define foreign key interface
export interface TableForeignKey {
  column: string
  references: string
  on: string
  isLoadingColumns?: boolean
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
