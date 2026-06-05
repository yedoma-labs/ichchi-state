import type { PersistConfig } from './types'
import { safeJSONParse, sanitizeObject, checkStorageQuota } from './security'

export function createPersist<T>(config: PersistConfig<T>) {
  const { key, storage = localStorage, version = 1, migrate, partialize } = config

  const hydrate = (): Partial<T> | null => {
    try {
      const item = storage.getItem(key)
      if (!item) return null

      // SECURITY: Use safe JSON parse to prevent prototype pollution (CWE-1321)
      const parsed = safeJSONParse<{ state: any; version: number }>(item)
      if (!parsed) return null

      const { state, version: persistedVersion } = parsed

      // SECURITY: Sanitize state object
      const sanitizedState = sanitizeObject(state)

      // Handle version migration
      if (migrate && persistedVersion !== version) {
        return migrate(sanitizedState, persistedVersion) as Partial<T>
      }

      return sanitizedState
    } catch (error) {
      console.error('[bylyt/state] Failed to hydrate state:', error)
      return null
    }
  }

  const save = (state: T) => {
    try {
      const stateToSave = partialize ? partialize(state) : state
      const item = JSON.stringify({ state: stateToSave, version })
      
      // SECURITY: Check storage quota before write (CWE-400)
      const quotaCheck = checkStorageQuota(storage, key, item)
      if (!quotaCheck.ok) {
        console.error('[bylyt/state] Storage quota check failed:', quotaCheck.error)
        return
      }
      
      storage.setItem(key, item)
    } catch (error) {
      console.error('[bylyt/state] Failed to persist state:', error)
    }
  }

  const cleanup = () => {
    try {
      storage.removeItem(key)
    } catch (error) {
      console.error('[bylyt/state] Failed to cleanup persisted state:', error)
    }
  }

  return { hydrate, save, cleanup }
}
