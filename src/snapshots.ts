import type { Store } from './types'
import { safeJSONParse, validateSnapshot, sanitizeObject, securityWarn, securityError } from './security'

export interface Snapshot<T> {
  id: string
  state: T
  timestamp: number
  label?: string
}

export interface StateDiff {
  added: Record<string, any>
  removed: Record<string, any>
  changed: Record<string, { from: any; to: any }>
}

/**
 * Create snapshots of state and compare diffs
 */
export function createSnapshots<T extends object>(store: Store<T>) {
  const snapshots = new Map<string, Snapshot<T>>()

  return {
    /**
     * Create a snapshot of current state
     */
    create(id: string, label?: string): Snapshot<T> {
      const snapshot: Snapshot<T> = {
        id,
        state: { ...store.getState() },
        timestamp: Date.now(),
        label
      }

      snapshots.set(id, snapshot)
      return snapshot
    },

    /**
     * Restore a snapshot
     */
    restore(id: string): boolean {
      const snapshot = snapshots.get(id)
      if (!snapshot) return false

      store.setState(snapshot.state as any, `RESTORE_SNAPSHOT_${id}`)
      return true
    },

    /**
     * Get a snapshot
     */
    get(id: string): Snapshot<T> | undefined {
      return snapshots.get(id)
    },

    /**
     * List all snapshots
     */
    list(): Snapshot<T>[] {
      return Array.from(snapshots.values())
    },

    /**
     * Delete a snapshot
     */
    delete(id: string): boolean {
      return snapshots.delete(id)
    },

    /**
     * Clear all snapshots
     */
    clear(): void {
      snapshots.clear()
    },

    /**
     * Compare two snapshots or a snapshot with current state
     * SECURITY: Limited to prevent DoS on large objects (CWE-407)
     */
    diff(idA: string, idB?: string, maxKeys: number = 10000): StateDiff | null {
      const snapshotA = snapshots.get(idA)
      if (!snapshotA) return null

      const stateA = snapshotA.state
      const stateB = idB ? snapshots.get(idB)?.state : store.getState()
      if (!stateB) return null

      const diff: StateDiff = {
        added: {},
        removed: {},
        changed: {}
      }

      // SECURITY: Check key count to prevent DoS
      const keysBCount = Object.keys(stateB).length
      if (keysBCount > maxKeys) {
        securityError(`[Security] State has too many keys (${keysBCount}), max: ${maxKeys}`)
        return null
      }
      
      // Find added and changed
      Object.keys(stateB).forEach(key => {
        if (!(key in stateA)) {
          diff.added[key] = stateB[key as keyof T]
        } else if (stateA[key as keyof T] !== stateB[key as keyof T]) {
          diff.changed[key] = {
            from: stateA[key as keyof T],
            to: stateB[key as keyof T]
          }
        }
      })

      // Find removed
      Object.keys(stateA).forEach(key => {
        if (!(key in stateB)) {
          diff.removed[key] = stateA[key as keyof T]
        }
      })

      return diff
    },

    /**
     * Export snapshots to JSON
     */
    export(): string {
      return JSON.stringify(Array.from(snapshots.values()), null, 2)
    },

    /**
     * Import snapshots from JSON
     * SECURITY: Validates structure to prevent injection (CWE-502)
     */
    import(json: string): void {
      try {
        // SECURITY: Use safe JSON parse
        const parsed = safeJSONParse(json)
        if (!parsed || !Array.isArray(parsed)) {
          securityError('[Security] Invalid snapshot import: not an array')
          return
        }
        
        // SECURITY: Validate each snapshot structure
        const imported = parsed.filter(snapshot => {
          if (!validateSnapshot(snapshot)) {
            securityWarn(`[Security] Skipping invalid snapshot: ${snapshot?.id}`)
            return false
          }
          return true
        }) as Snapshot<T>[]
        
        // SECURITY: Limit number of imported snapshots
        const MAX_IMPORT = 100
        if (imported.length > MAX_IMPORT) {
          securityError(`[Security] Too many snapshots (${imported.length}), max: ${MAX_IMPORT}`)
          return
        }
        
        imported.forEach(snapshot => {
          // SECURITY: Sanitize state object
          snapshot.state = sanitizeObject(snapshot.state)
          snapshots.set(snapshot.id, snapshot)
        })
      } catch (err) {
        console.error('Failed to import snapshots:', err)
      }
    }
  }
}
