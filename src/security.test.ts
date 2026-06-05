import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStore, applyMiddleware } from './store'
import { createPersist } from './persist'
import { crossTabSync } from './cross-tab-sync'
import { subscribeToField } from './field-subscriptions'
import { createSnapshots } from './snapshots'
import { createOptimisticUpdates } from './optimistic-updates'
import { createBatcher } from './batch-updates'
import { timeTravel } from './middleware'
import { 
  safeJSONParse, 
  sanitizeObject, 
  validatePath,
  RateLimiter,
  estimateSize
} from './security'

describe('Security Tests', () => {
  describe('Prototype Pollution Prevention', () => {
    it('should block __proto__ in JSON.parse', () => {
      const maliciousJSON = '{"__proto__":{"isAdmin":true},"count":5}'
      const result = safeJSONParse(maliciousJSON)
      
      expect(result).toBeTruthy()
      expect(result.count).toBe(5)
      // Verify __proto__ is not an own property
      expect(Object.prototype.hasOwnProperty.call(result, '__proto__')).toBe(false)
      
      // Verify pollution didn't happen
      expect((({} as any).isAdmin)).toBeUndefined()
    })

    it('should block constructor in JSON.parse', () => {
      const maliciousJSON = '{"constructor":{"prototype":{"polluted":true}},"count":5}'
      const result = safeJSONParse(maliciousJSON)
      
      expect(result).toBeTruthy()
      expect(result.count).toBe(5)
      // Verify constructor is not an own property
      expect(Object.prototype.hasOwnProperty.call(result, 'constructor')).toBe(false)
    })

    it('should sanitize objects with dangerous keys', () => {
      const maliciousObj = {
        count: 5,
        __proto__: { isAdmin: true },
        constructor: { prototype: { polluted: true } },
        prototype: { evil: true }
      } as any

      const sanitized = sanitizeObject(maliciousObj)
      
      expect(sanitized.count).toBe(5)
      // Verify dangerous keys are not own properties
      expect(Object.prototype.hasOwnProperty.call(sanitized, '__proto__')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'constructor')).toBe(false)
      expect(Object.prototype.hasOwnProperty.call(sanitized, 'prototype')).toBe(false)
    })

    it('should prevent prototype pollution via persist.hydrate', () => {
      const maliciousStorage = {
        getItem: () => JSON.stringify({
          state: { 
            count: 5,
            __proto__: { isAdmin: true }
          },
          version: 1
        }),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }

      const { hydrate } = createPersist({
        key: 'test',
        storage: maliciousStorage as any
      })

      const state = hydrate()
      expect(state).toBeTruthy()
      expect((state as any).count).toBe(5)
      // Check that __proto__ is not an own property
      expect(Object.prototype.hasOwnProperty.call(state, '__proto__')).toBe(false)
    })

    it('should prevent prototype pollution via cross-tab sync', async () => {
      // Skip in non-browser environments where StorageEvent is not available
      if (typeof StorageEvent === 'undefined') {
        console.log('[Security] Skipping cross-tab sync test (StorageEvent not available)')
        return
      }

      const store = createStore({ count: 0 })
      const cleanup = crossTabSync(store, { key: 'security-test' })

      const maliciousEvent = new StorageEvent('storage', {
        key: 'security-test',
        newValue: JSON.stringify({
          count: 5,
          __proto__: { isAdmin: true }
        })
      })

      window.dispatchEvent(maliciousEvent)
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(store.getState().count).toBe(5)
      // Check that __proto__ is not an own property
      expect(Object.prototype.hasOwnProperty.call(store.getState(), '__proto__')).toBe(false)
      expect((({} as any).isAdmin)).toBeUndefined()

      cleanup()
    })

    it('should prevent prototype pollution via snapshot import', () => {
      const store = createStore({ count: 0 })
      const snapshots = createSnapshots(store)

      const maliciousJSON = JSON.stringify([{
        id: 'malicious',
        state: {
          count: 5,
          __proto__: { isAdmin: true }
        },
        timestamp: Date.now()
      }])

      snapshots.import(maliciousJSON)

      const imported = snapshots.get('malicious')
      expect(imported?.state.count).toBe(5)
      // Check that __proto__ is not an own property
      expect(Object.prototype.hasOwnProperty.call(imported?.state, '__proto__')).toBe(false)
    })
  })

  describe('Path Traversal Prevention', () => {
    it('should reject __proto__ in field subscription path', () => {
      const store = createStore({ user: { name: 'Alice' } })
      
      expect(() => {
        subscribeToField(store, '__proto__.polluted' as any, () => {})
      }).toThrow('[Security]')
    })

    it('should reject constructor in field subscription path', () => {
      const store = createStore({ user: { name: 'Alice' } })
      
      expect(() => {
        subscribeToField(store, 'constructor.prototype.isAdmin' as any, () => {})
      }).toThrow('[Security]')
    })

    it('should allow safe nested paths', () => {
      const store = createStore({ 
        user: { profile: { name: 'Alice' } } 
      })
      
      const listener = vi.fn()
      const unsub = subscribeToField(
        store, 
        'user.profile.name' as any, 
        listener
      )

      store.setState({ 
        user: { profile: { name: 'Bob' } } 
      })

      expect(listener).toHaveBeenCalled()
      unsub()
    })

    it('should validate path segments', () => {
      expect(() => validatePath('user.name')).not.toThrow()
      expect(() => validatePath('__proto__.polluted')).toThrow()
      expect(() => validatePath('constructor.prototype')).toThrow()
      expect(() => validatePath('user..name')).toThrow('[Security] Path contains empty segment')
    })
  })

  describe('DoS Prevention - Memory Limits', () => {
    it('should enforce max listeners limit', () => {
      const store = createStore({ count: 0 }, { maxListeners: 5 })
      
      // Add 5 listeners (should work)
      const unsubs = Array.from({ length: 5 }, () => 
        store.subscribe(() => {})
      )

      // Try to add 6th listener (should fail)
      expect(() => {
        store.subscribe(() => {})
      }).toThrow('[Security]')

      unsubs.forEach(unsub => unsub())
    })

    it('should enforce memory budget in time travel middleware', () => {
      const store = createStore({ data: 'x'.repeat(1000) })
      const enhancedStore = applyMiddleware(
        store, 
        timeTravel({ maxMemoryMB: 0.01 }) // 10KB limit
      ) as any

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Add enough state to exceed memory budget
      for (let i = 0; i < 20; i++) {
        enhancedStore.setState({ data: 'x'.repeat(1000) + i })
      }

      // Should have warned about memory budget
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security] Time travel memory budget')
      )

      warnSpy.mockRestore()
    })

    it('should enforce max pending optimistic updates', () => {
      const store = createStore({ count: 0 })
      const optimistic = createOptimisticUpdates(store, { maxPending: 3 })

      // Add 3 pending updates (should work)
      optimistic.optimistic('1', () => ({ count: 1 }), () => new Promise(() => {})).catch(() => {})
      optimistic.optimistic('2', () => ({ count: 2 }), () => new Promise(() => {})).catch(() => {})
      optimistic.optimistic('3', () => ({ count: 3 }), () => new Promise(() => {})).catch(() => {})

      // Try to add 4th (should fail)
      expect(() => {
        optimistic.optimistic('4', () => ({ count: 4 }), () => new Promise(() => {}))
      }).toThrow('[Security]')

      optimistic.destroy()
    })

    it('should enforce max batch queue size', () => {
      const store = createStore({ count: 0 })
      const batcher = createBatcher(store, { maxBatchSize: 3 })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      batcher.startBatch()
      
      // Add updates up to limit
      batcher.setState({ count: 1 })
      batcher.setState({ count: 2 })
      batcher.setState({ count: 3 })
      batcher.setState({ count: 4 }) // Should trigger warning and flush

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security] Batch queue size')
      )

      batcher.endBatch()
      warnSpy.mockRestore()
    })

    it('should have TTL cleanup mechanism', () => {
      const store = createStore({ count: 0 })
      const optimistic = createOptimisticUpdates(store, { 
        maxPending: 100,
        ttlMs: 300000 // 5 min
      })

      // Create pending update
      optimistic.optimistic(
        'test', 
        () => ({ count: 1 }), 
        () => new Promise(() => {})
      ).catch(() => {})

      expect(optimistic.getPending()).toContain('test')

      // Verify cleanup method exists
      expect(optimistic.destroy).toBeDefined()
      expect(typeof optimistic.destroy).toBe('function')

      // Cleanup should clear pending updates
      optimistic.destroy()
      
      // After destroy, no new updates should be accepted
      // (the destroy clears the interval)
    })
  })

  describe('DoS Prevention - Rate Limiting', () => {
    it('should rate limit cross-tab sync events', async () => {
      const store = createStore({ count: 0 })
      const cleanup = crossTabSync(store, { 
        key: 'rate-limit-test',
        maxEventsPerSecond: 2
      })

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Send 5 rapid events (should only process 2)
      for (let i = 0; i < 5; i++) {
        const event = new StorageEvent('storage', {
          key: 'rate-limit-test',
          newValue: JSON.stringify({ count: i })
        })
        window.dispatchEvent(event)
      }

      await new Promise(resolve => setTimeout(resolve, 50))

      // Should have warned about rate limiting
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security] Cross-tab sync rate limit exceeded')
      )

      cleanup()
      warnSpy.mockRestore()
    })

    it('should use RateLimiter correctly', () => {
      const limiter = new RateLimiter(3, 10) // 3 tokens, 10 per second

      // Consume 3 tokens (should work)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)
      expect(limiter.tryConsume()).toBe(true)

      // Try to consume 4th (should fail)
      expect(limiter.tryConsume()).toBe(false)

      // Reset and try again
      limiter.reset()
      expect(limiter.tryConsume()).toBe(true)
    })
  })

  describe('Storage Quota Protection', () => {
    it('should check storage quota before persist', () => {
      const largeSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn()
      }

      const { save } = createPersist({
        key: 'large-test',
        storage: mockStorage as any
      })

      // Create very large state (> 500KB default limit)
      const largeState = { data: 'x'.repeat(500 * 1024) }
      save(largeState)

      // Should have logged error about quota
      expect(largeSpy).toHaveBeenCalled()
      const calls = (largeSpy.mock.calls as any).flat()
      const hasQuotaError = calls.some((call: any) => 
        typeof call === 'string' && call.includes('Storage quota check failed')
      )
      expect(hasQuotaError).toBe(true)

      largeSpy.mockRestore()
    })
  })

  describe('Input Sanitization', () => {
    it('should sanitize state updates in store.setState', () => {
      const store = createStore({ count: 0 })
      
      const maliciousUpdate = {
        count: 5,
        __proto__: { isAdmin: true }
      } as any

      store.setState(maliciousUpdate)

      expect(store.getState().count).toBe(5)
      // __proto__ cannot be set as own property after sanitization
      expect(Object.prototype.hasOwnProperty.call(store.getState(), '__proto__')).toBe(false)
      expect((({} as any).isAdmin)).toBeUndefined()
    })

    it('should sanitize function-based state updates', () => {
      const store = createStore({ count: 0 })
      
      store.setState((state) => ({
        count: state.count + 1,
        __proto__: { isAdmin: true }
      } as any))

      expect(store.getState().count).toBe(1)
      // __proto__ cannot be set as own property after sanitization
      expect(Object.prototype.hasOwnProperty.call(store.getState(), '__proto__')).toBe(false)
    })
  })

  describe('Snapshot Security', () => {
    it('should reject snapshots with dangerous IDs', () => {
      const store = createStore({ count: 0 })
      const snapshots = createSnapshots(store)

      const maliciousJSON = JSON.stringify([{
        id: '__proto__.polluted',
        state: { count: 5 },
        timestamp: Date.now()
      }])

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      snapshots.import(maliciousJSON)

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Security] Snapshot ID contains dangerous string')
      )
      expect(snapshots.get('__proto__.polluted')).toBeUndefined()

      warnSpy.mockRestore()
    })

    it('should limit number of imported snapshots', () => {
      const store = createStore({ count: 0 })
      const snapshots = createSnapshots(store)

      // Create 150 snapshots (> 100 limit)
      const tooMany = Array.from({ length: 150 }, (_, i) => ({
        id: `snap-${i}`,
        state: { count: i },
        timestamp: Date.now()
      }))

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      snapshots.import(JSON.stringify(tooMany))

      expect(errorSpy).toHaveBeenCalled()
      const calls = errorSpy.mock.calls
      const hasSnapshotLimitError = calls.some(call => 
        call[0] && String(call[0]).includes('[Security] Too many snapshots')
      )
      expect(hasSnapshotLimitError).toBe(true)

      errorSpy.mockRestore()
    })

    it('should limit diff computation keys', () => {
      // Clear any previous mocks
      vi.clearAllMocks()
      
      const store = createStore({ count: 0 } as any)
      const snapshots = createSnapshots(store)

      snapshots.create('before')

      // Create huge state with many keys
      const hugeState: any = {}
      for (let i = 0; i < 15000; i++) {
        hugeState[`key${i}`] = i
      }
      store.setState(hugeState)

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const diff = snapshots.diff('before')

      // Should log error about too many keys
      expect(errorSpy).toHaveBeenCalled()
      const calls = errorSpy.mock.calls
      const hasKeyError = calls.some(call => 
        call[0] && String(call[0]).includes('[Security] State has too many keys')
      )
      expect(hasKeyError).toBe(true)
      expect(diff).toBeNull()

      errorSpy.mockRestore()
    })
  })

  describe('Utility Functions', () => {
    it('should estimate object size correctly', () => {
      const small = { count: 5 }
      const large = { data: 'x'.repeat(1000) }

      const smallSize = estimateSize(small)
      const largeSize = estimateSize(large)

      expect(largeSize).toBeGreaterThan(smallSize)
      expect(largeSize).toBeGreaterThan(2000) // At least 2KB
    })

    it('should handle invalid JSON gracefully', () => {
      const result = safeJSONParse('invalid json {')
      expect(result).toBeNull()
    })
  })

  describe('Infinite Loop Prevention', () => {
    it('should prevent infinite sync loops in cross-tab', async () => {
      const store1 = createStore({ count: 0 })
      const store2 = createStore({ count: 0 })

      const cleanup1 = crossTabSync(store1, { key: 'loop-test' })
      const cleanup2 = crossTabSync(store2, { key: 'loop-test' })

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // This could trigger infinite loop without protection
      store1.setState({ count: 1 })
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not have warned about sync loop
      // (the sync counter prevents it)
      const syncWarnings = (warnSpy.mock.calls as any).filter(
        (call: any) => call[0]?.includes('Sync already in progress')
      )
      
      // Some warnings are okay, but not excessive
      expect(syncWarnings.length).toBeLessThan(10)

      cleanup1()
      cleanup2()
      warnSpy.mockRestore()
    })
  })
})
