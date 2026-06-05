import type { Store, SetStateFn } from './types'
import { securityWarn } from './security'

/**
 * Batch multiple state updates into a single update
 * Reduces re-renders in React
 */
export function createBatcher<T extends object>(
  store: Store<T>,
  options: {
    maxBatchSize?: number // SECURITY: Limit batch queue size
  } = {}
) {
  const { maxBatchSize = 100 } = options
  let batchedUpdates: Array<Partial<T> | ((state: T) => Partial<T>)> = []
  let batchTimeout: NodeJS.Timeout | null = null
  let isBatching = false

  const flush = () => {
    if (batchedUpdates.length === 0) return

    const updates = [...batchedUpdates]
    batchedUpdates = []
    batchTimeout = null

    // Merge all updates into one
    const finalUpdate = updates.reduce((acc, update) => {
      const partial = typeof update === 'function' ? update(store.getState()) : update
      return { ...acc, ...partial }
    }, {} as Partial<T>)

    store.setState(finalUpdate, 'BATCH_UPDATE')
  }

  return {
    /**
     * Add an update to the batch
     */
    setState: ((partial, actionName) => {
      if (!isBatching) {
        // If not batching, apply immediately
        store.setState(partial, actionName)
        return
      }
      
      // SECURITY: Enforce max batch size (CWE-770)
      if (batchedUpdates.length >= maxBatchSize) {
        securityWarn(
          `[Security] Batch queue size (${maxBatchSize}) exceeded. ` +
          'Flushing early to prevent DoS.'
        )
        flush()
      }

      batchedUpdates.push(partial)

      // Auto-flush on next tick if not already scheduled
      if (!batchTimeout) {
        batchTimeout = setTimeout(flush, 0)
      }
    }) as SetStateFn<T>,

    /**
     * Start batching mode
     */
    startBatch(): void {
      isBatching = true
    },

    /**
     * End batching mode and flush
     */
    endBatch(): void {
      isBatching = false
      if (batchTimeout) {
        clearTimeout(batchTimeout)
      }
      flush()
    },

    /**
     * Execute a function in batch mode
     */
    batch<R>(fn: () => R): R {
      this.startBatch()
      try {
        return fn()
      } finally {
        this.endBatch()
      }
    },

    /**
     * Manually flush pending updates
     */
    flush
  }
}
