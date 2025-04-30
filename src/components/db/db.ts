import { ref } from 'vue'

// Reserved SQL keywords that shouldn't be used as column names or table names
export const reservedKeywords = [
  'add',
  'all',
  'alter',
  'and',
  'any',
  'as',
  'asc',
  'backup',
  'between',
  'case',
  'check',
  'column',
  'constraint',
  'create',
  'database',
  'default',
  'delete',
  'desc',
  'distinct',
  'drop',
  'exec',
  'exists',
  'foreign',
  'from',
  'full',
  'group',
  'having',
  'in',
  'index',
  'inner',
  'insert',
  'is',
  'join',
  'key',
  'left',
  'like',
  'limit',
  'not',
  'null',
  'or',
  'order',
  'outer',
  'primary',
  'procedure',
  'right',
  'rownum',
  'select',
  'set',
  'table',
  'top',
  'truncate',
  'union',
  'unique',
  'update',
  'values',
  'view',
  'where',
]

// Column types
export const columnTypes = ref([
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

// Format a database name to follow naming conventions (replace spaces with underscores, etc.)
export function formatDatabaseName(name: string): string {
  // Replace spaces with underscores
  let formatted = name.replace(/\s+/g, '_')

  // Remove special characters except underscores
  formatted = formatted.replace(/[^a-zA-Z0-9_]/g, '')

  // Ensure it starts with a letter or underscore
  if (formatted && !/^[a-zA-Z_]/.test(formatted)) {
    formatted = '_' + formatted
  }

  return formatted
}

// Helper to determine if a column type needs length specification
export function needsLength(type: string): boolean {
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
