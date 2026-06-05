import type { Store } from './types'
import { safeJSONParse, sanitizeObject, RateLimiter, checkStorageQuota, securityWarn, securityError } from './security'

export interface CrossTabSyncOptions {
  key: string
  syncDelay?: number
  filter?: (state: any) => any
  maxEventsPerSecond?: number
}

/**
 * Synchronize state across browser tabs using localStorage events
 */
export function crossTabSync<T extends object>(
  store: Store<T>,
  options: CrossTabSyncOptions
): () => void {
  if (typeof window === 'undefined') return () => {}

  const { 
    key, 
    syncDelay = 50, 
    filter = (state) => state,
    maxEventsPerSecond = 10 
  } = options
  
  let syncCounter = 0 // SECURITY: Track sync depth to prevent infinite loops
  let syncTimeout: NodeJS.Timeout | null = null
  
  // SECURITY: Rate limiter to prevent DoS (CWE-770)
  const rateLimiter = new RateLimiter(maxEventsPerSecond, maxEventsPerSecond)

  // Listen to changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key !== key || !e.newValue) return
    
    // SECURITY: Rate limit incoming events to prevent DoS (CWE-770)
    if (!rateLimiter.tryConsume()) {
      securityWarn('[Security] Cross-tab sync rate limit exceeded, dropping event')
      return
    }
    
    // SECURITY: Check sync depth to prevent infinite loops
    if (syncCounter > 0) {
      securityWarn('[Security] Sync already in progress, skipping to prevent loop')
      return
    }

    try {
      // SECURITY: Use safe JSON parse to prevent prototype pollution (CWE-1321, CWE-502)
      const parsed = safeJSONParse<T>(e.newValue)
      if (!parsed) return
      
      // SECURITY: Sanitize incoming state
      const newState = sanitizeObject(parsed)
      
      syncCounter++
      try {
        store.setState(newState, 'CROSS_TAB_SYNC')
      } finally {
        syncCounter--
      }
    } catch (err) {
      console.error('Failed to sync state from other tab:', err)
    }
  }

  // Broadcast changes to other tabs
  const unsubscribe = store.subscribe((state) => {
    // SECURITY: Don't broadcast during incoming sync
    if (syncCounter > 0) return

    if (syncTimeout) clearTimeout(syncTimeout)
    
    syncTimeout = setTimeout(() => {
      try {
        const stateToSync = filter(state)
        const serialized = JSON.stringify(stateToSync)
        
        // SECURITY: Check storage quota before write (CWE-400)
        const quotaCheck = checkStorageQuota(localStorage, key, serialized)
        if (!quotaCheck.ok) {
          console.error('[Security] Storage quota check failed:', quotaCheck.error)
          return
        }
        
        localStorage.setItem(key, serialized)
      } catch (err) {
        console.error('Failed to broadcast state to other tabs:', err)
      }
    }, syncDelay)
  })

  window.addEventListener('storage', handleStorageChange)

  return () => {
    window.removeEventListener('storage', handleStorageChange)
    unsubscribe()
    if (syncTimeout) clearTimeout(syncTimeout)
  }
}
