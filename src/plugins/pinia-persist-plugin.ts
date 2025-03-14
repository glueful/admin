import type { PiniaPluginContext } from 'pinia'

// ========== Compression Implementation ==========

/**
 * A simple LZ-based string compression implementation
 * Based on LZ-string compression algorithm concepts
 */
export function compress(input: string): string {
  if (!input) return ''

  // Create a dictionary for character sequences
  const dictionary: Record<string, number> = {}
  const uncompressed = input
  let c: string
  let wc: string
  let w = ''
  const result = []
  let dictSize = 256

  // Initialize dictionary with single characters
  for (let i = 0; i < 256; i++) {
    dictionary[String.fromCharCode(i)] = i
  }

  for (let i = 0; i < uncompressed.length; i++) {
    c = uncompressed.charAt(i)
    wc = w + c

    if (dictionary[wc] !== undefined) {
      w = wc
    } else {
      result.push(dictionary[w])
      // Add wc to the dictionary
      dictionary[wc] = dictSize++
      w = c
    }
  }

  // Output the code for w
  if (w !== '') {
    result.push(dictionary[w])
  }

  // Convert to a more compact string representation
  return result
    .map((code) => {
      // Use a URL-safe base64-like encoding for the values
      if (code < 64)
        return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.charAt(code)
      // For larger codes, use a multi-character representation
      return '|' + code.toString(36)
    })
    .join('')
}

export function decompress(compressed: string): string {
  if (!compressed) return ''

  // Parse the compressed string back to codes
  const codes: number[] = []
  let i = 0

  while (i < compressed.length) {
    const char = compressed.charAt(i)
    if (char === '|') {
      // Multi-character code
      let end = i + 1
      while (
        end < compressed.length &&
        ((compressed.charCodeAt(end) >= 48 && compressed.charCodeAt(end) <= 57) || // 0-9
          (compressed.charCodeAt(end) >= 97 && compressed.charCodeAt(end) <= 122))
      ) {
        // a-z
        end++
      }
      codes.push(parseInt(compressed.substring(i + 1, end), 36))
      i = end
    } else {
      // Single character code
      codes.push('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.indexOf(char))
      i++
    }
  }

  // Rebuild the original string
  const dictionary: string[] = []
  // Initialize dictionary with single characters
  for (let i = 0; i < 256; i++) {
    dictionary[i] = String.fromCharCode(i)
  }

  let result = ''
  let dictSize = 256
  let entry = ''
  let w = String.fromCharCode(codes[0])
  result = w

  for (let i = 1; i < codes.length; i++) {
    const code = codes[i]

    if (code < dictSize) {
      entry = dictionary[code]
    } else {
      entry = w + w.charAt(0)
    }

    result += entry

    // Add w+entry[0] to the dictionary
    dictionary[dictSize++] = w + entry.charAt(0)

    w = entry
  }

  return result
}

// Utility to measure compression savings
export function getCompressionRatio(original: string, compressed: string): number {
  if (!original) return 0
  const originalSize = new TextEncoder().encode(original).length
  const compressedSize = new TextEncoder().encode(compressed).length
  return (1 - compressedSize / originalSize) * 100 // Return as percentage saved
}

// ========== Debounce Implementation ==========

// Utility for debouncing function calls
function debounce<F extends (...args: any[]) => any>(
  func: F,
  wait: number,
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function (...args: Parameters<F>): void {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

// ========== Plugin Types ==========

export interface PersistStrategy {
  key?: string
  storage?: Storage
  paths?: string[]
  // New options
  debounce?: number
  serializer?: {
    serialize: (value: any) => string
    deserialize: (value: string) => any
  }
  mergeStrategy?: 'overwrite' | 'deep' | 'shallow'
  compress?: boolean
}

export interface PersistOptions {
  enabled: true
  strategies?: PersistStrategy[]
  // New options
  maxStores?: number
}

type Store = PiniaPluginContext['store']
type PartialState = Partial<Store['$state']>

declare module 'pinia' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface DefineStoreOptionsBase<S, Store> {
    persist?: PersistOptions
  }
}

// ========== Helper Functions ==========

// Check if storage is available
function isStorageAvailable(storage: Storage): boolean {
  try {
    const testKey = '__pinia_storage_test__'
    storage.setItem(testKey, testKey)
    storage.removeItem(testKey)
    return true
  } catch (e) {
    console.error('Storage is not available', e)
    return false
  }
}

// Deep merge two objects
function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || target === null) return source
  if (typeof source !== 'object' || source === null) return source

  const result = { ...target }

  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      result[key] = deepMerge(target[key], source[key])
    } else {
      result[key] = source[key]
    }
  }

  return result
}

// Simple object clone
function shallowMerge(target: any, source: any): any {
  return { ...target, ...source }
}

// ========== Main Plugin Functions ==========

export const updateStorage = (strategy: PersistStrategy, store: Store): void => {
  try {
    const storage = strategy.storage || sessionStorage
    const storeKey = strategy.key || store.$id

    // Check if storage is available
    if (!isStorageAvailable(storage)) {
      console.warn(`Storage is not available for store "${store.$id}"`)
      return
    }

    // Determine what part of state to save
    let stateToSave: any
    if (strategy.paths) {
      const partialState = strategy.paths.reduce((finalObj, key) => {
        finalObj[key] = store.$state[key]
        return finalObj
      }, {} as PartialState)
      stateToSave = partialState
    } else {
      stateToSave = store.$state
    }

    // Serialize state
    let serializedState: string
    if (strategy.serializer) {
      serializedState = strategy.serializer.serialize(stateToSave)
    } else {
      serializedState = JSON.stringify(stateToSave)
    }

    // Compress if needed - Using actual compression
    if (strategy.compress) {
      serializedState = compress(serializedState)
    }

    // Save to storage
    storage.setItem(storeKey, serializedState)
  } catch (error) {
    console.error(`Failed to update storage for store "${store.$id}"`, error)
  }
}

export default ({ options, store }: PiniaPluginContext): void => {
  if (!options.persist?.enabled) return

  const defaultStrat: PersistStrategy[] = [
    {
      key: store.$id,
      storage: sessionStorage,
      debounce: 100,
      mergeStrategy: 'shallow',
    },
  ]

  const strategies = options.persist?.strategies?.length ? options.persist.strategies : defaultStrat

  // Clean up old stores if maxStores is configured
  if (options.persist.maxStores) {
    try {
      // This is a simplified approach - in reality you might want to keep track of
      // most recently used stores more accurately
      const storage = sessionStorage
      const storeKeys = Object.keys(storage).filter((key) => key.startsWith('pinia_'))
      if (storeKeys.length > options.persist.maxStores) {
        const keysToRemove = storeKeys.slice(0, storeKeys.length - options.persist.maxStores)
        keysToRemove.forEach((key) => storage.removeItem(key))
      }
    } catch (error) {
      console.warn('Failed to clean up old stores', error)
    }
  }

  // Restore state from storage for each strategy
  strategies.forEach((strategy) => {
    try {
      const storage = strategy.storage || sessionStorage
      const storeKey = strategy.key || store.$id

      if (!isStorageAvailable(storage)) {
        console.warn(`Storage is not available for store "${store.$id}"`)
        return
      }

      const storageResult = storage.getItem(storeKey)
      if (!storageResult) return

      // Decompress if needed - Using actual decompression
      const stateFromStorage = strategy.compress ? decompress(storageResult) : storageResult

      // Deserialize
      let parsedState: any
      if (strategy.serializer) {
        parsedState = strategy.serializer.deserialize(stateFromStorage)
      } else {
        parsedState = JSON.parse(stateFromStorage)
      }

      // Apply state based on merge strategy
      if (strategy.mergeStrategy === 'deep') {
        store.$state = deepMerge(store.$state, parsedState)
      } else if (strategy.mergeStrategy === 'shallow') {
        store.$state = shallowMerge(store.$state, parsedState)
      } else {
        // Default to overwrite
        store.$patch(parsedState)
      }
    } catch (error) {
      console.error(`Failed to restore state for store "${store.$id}"`, error)
    }
  })

  // Subscribe to store changes to update storage
  strategies.forEach((strategy) => {
    const updateFn = () => updateStorage(strategy, store)
    const debouncedUpdate = strategy.debounce ? debounce(updateFn, strategy.debounce) : updateFn

    store.$subscribe(debouncedUpdate)
  })
}
