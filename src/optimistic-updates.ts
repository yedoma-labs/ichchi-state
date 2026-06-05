import type { Store } from './types'
import { securityWarn } from './security'

interface OptimisticUpdate<T> {
  id: string
  rollback: T
  timestamp: number
}

/**
 * Enable optimistic updates with automatic rollback on failure
 */
export function createOptimisticUpdates<T extends object>(
  store: Store<T>,
  options: {
    maxPending?: number
    ttlMs?: number // SECURITY: TTL for cleanup
  } = {}
) {
  const { maxPending = 100, ttlMs = 5 * 60 * 1000 } = options // 5 minutes default
  const pendingUpdates = new Map<string, OptimisticUpdate<T>>()
  
  // SECURITY: Periodic cleanup of stale updates (CWE-770)
  const cleanupInterval = setInterval(() => {
    const now = Date.now()
    const stale: string[] = []
    
    pendingUpdates.forEach((update, id) => {
      if (now - update.timestamp > ttlMs) {
        stale.push(id)
      }
    })
    
    stale.forEach(id => {
      securityWarn(`[Security] Cleaning up stale optimistic update: ${id}`)
      pendingUpdates.delete(id)
    })
  }, ttlMs)

  return {
    /**
     * Apply an optimistic update that can be rolled back
     */
    optimistic<R>(
      id: string,
      updateFn: (state: T) => Partial<T>,
      asyncAction: () => Promise<R>
    ): Promise<R> {
      // SECURITY: Check max pending updates (CWE-770)
      if (pendingUpdates.size >= maxPending) {
        throw new Error(
          `[Security] Maximum pending optimistic updates (${maxPending}) exceeded. ` +
          'Possible memory leak or DoS attempt.'
        )
      }
      
      const rollback = store.getState()
      const update = updateFn(rollback)

      // Store rollback state
      pendingUpdates.set(id, {
        id,
        rollback,
        timestamp: Date.now()
      })

      // Apply optimistic update
      store.setState(update, `OPTIMISTIC_UPDATE_${id}`)

      // Execute async action
      return asyncAction()
        .then((result) => {
          // Success - remove rollback
          pendingUpdates.delete(id)
          return result
        })
        .catch((error) => {
          // Failure - rollback
          this.rollback(id)
          throw error
        })
    },

    /**
     * Manually rollback an optimistic update
     */
    rollback(id: string): boolean {
      const update = pendingUpdates.get(id)
      if (!update) return false

      store.setState(update.rollback as any, `ROLLBACK_${id}`)
      pendingUpdates.delete(id)
      return true
    },

    /**
     * Rollback all pending optimistic updates
     */
    rollbackAll(): void {
      // Sort by timestamp (oldest first) to rollback in correct order
      const updates = Array.from(pendingUpdates.values())
        .sort((a, b) => a.timestamp - b.timestamp)

      updates.forEach(update => {
        store.setState(update.rollback as any, `ROLLBACK_${update.id}`)
      })

      pendingUpdates.clear()
    },

    /**
     * Get pending optimistic updates
     */
    getPending(): string[] {
      return Array.from(pendingUpdates.keys())
    },
    
    /**
     * Cleanup interval (call on destroy)
     */
    destroy(): void {
      clearInterval(cleanupInterval)
      pendingUpdates.clear()
    },

    /**
     * Check if an update is pending
     */
    isPending(id: string): boolean {
      return pendingUpdates.has(id)
    }
  }
}
