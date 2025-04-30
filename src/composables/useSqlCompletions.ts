// useSqlCompletions.ts
import { autocompletion } from '@codemirror/autocomplete'
import type { Completion } from '@codemirror/autocomplete'
import { SQL_KEYWORDS } from '@/constants/sqlKeywords'
import { useDBTablesStore } from '@/stores/dbTables'

export function sqlCompletions() {
  const dbTablesStore = useDBTablesStore()
  console.log('SQL Completions initialized', dbTablesStore.hasLoadedTables)
  console.log('DB Tables Store:', dbTablesStore.tables)
  // If tables aren't loaded yet, trigger loading them in the background
  if (!dbTablesStore.hasLoadedTables) {
    console.log('Loading database tables for SQL completions...')
    // Use a promise to load tables asynchronously without blocking
    dbTablesStore.fetchTables().catch((error) => {
      console.error('Failed to load database tables for SQL completions:', error)
    })
  }

  return autocompletion({
    override: [
      (context) => {
        // Get current word or empty string to show all completions
        const word = context.matchBefore(/\w*/) || { from: context.pos, to: context.pos, text: '' }

        // Always provide suggestions, even with just one character
        // Remove the condition that prevented showing completions for empty strings

        // Start with default SQL keywords
        const options: Completion[] = SQL_KEYWORDS.map((kw) => ({
          label: kw,
          type: 'keyword',
          boost: 99, // push these to the top
        }))

        // Add table names from the store if available
        // Make sure tables exists and is an array before trying to map over it
        if (dbTablesStore.hasLoadedTables && Array.isArray(dbTablesStore.tables)) {
          const tableCompletions: Completion[] = dbTablesStore.tables.map((table: any) => ({
            label: table || 'unknown', // Add fallback for table name
            type: 'keyword', // Use class type to visually differentiate tables
            boost: 100, // Give tables higher priority than keywords
            info: `Table: ${table || 'unknown'}`,
          }))

          options.push(...tableCompletions)
        }

        return {
          from: word.from,
          options,
          validFor: /^\w*$/,
        }
      },
    ],
    // Set a minimum length of 1 character to trigger completions
    activateOnTyping: true,
    defaultKeymap: true,
    closeOnBlur: true,
  })
}
