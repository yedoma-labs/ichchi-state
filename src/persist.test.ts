import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStore } from './store'
import { createPersist } from './persist'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
})

describe('Persistence', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createPersist', () => {
    it('should save state to storage', () => {
      const { save } = createPersist({ key: 'test-store' })
      
      save({ count: 5, name: 'test' })
      
      const saved = localStorage.getItem('test-store')
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved!)
      expect(parsed.state).toEqual({ count: 5, name: 'test' })
      expect(parsed.version).toBe(1)
    })

    it('should hydrate state from storage', () => {
      localStorage.setItem('test-store', JSON.stringify({ 
        state: { count: 10 }, 
        version: 1 
      }))
      
      const { hydrate } = createPersist({ key: 'test-store' })
      const state = hydrate()
      
      expect(state).toEqual({ count: 10 })
    })

    it('should return null if no saved state', () => {
      const { hydrate } = createPersist({ key: 'non-existent' })
      const state = hydrate()
      
      expect(state).toBeNull()
    })

    it('should handle corrupted storage data', () => {
      localStorage.setItem('test-store', 'invalid-json{')
      
      const { hydrate } = createPersist({ key: 'test-store' })
      const state = hydrate()
      
      expect(state).toBeNull()
    })

    it('should use custom storage', () => {
      const customStorage: Record<string, string> = {}
      
      const { save, hydrate } = createPersist({
        key: 'test-store',
        storage: {
          getItem: (key: string) => customStorage[key] || null,
          setItem: (key: string, value: string) => {
            customStorage[key] = value
          },
          removeItem: (key: string) => {
            delete customStorage[key]
          }
        }
      })
      
      save({ count: 42 })
      expect(customStorage['test-store']).toBeTruthy()
      const parsed = JSON.parse(customStorage['test-store'])
      expect(parsed.state).toEqual({ count: 42 })
      
      const state = hydrate()
      expect(state).toEqual({ count: 42 })
    })

    it('should cleanup storage on destroy', () => {
      const { save, cleanup } = createPersist({ key: 'test-store' })
      
      save({ count: 5 })
      expect(localStorage.getItem('test-store')).toBeTruthy()
      
      cleanup()
      expect(localStorage.getItem('test-store')).toBeNull()
    })

    it('should use partialize to save subset of state', () => {
      const { save } = createPersist({
        key: 'test-store',
        partialize: (state: any) => ({ count: state.count })
      })
      
      save({ count: 5, secret: 'hidden', temp: 'data' })
      
      const saved = localStorage.getItem('test-store')
      const parsed = JSON.parse(saved!)
      expect(parsed.state).toEqual({ count: 5 })
      expect(parsed.state.secret).toBeUndefined()
      expect(parsed.state.temp).toBeUndefined()
    })

    it('should handle version migration', () => {
      localStorage.setItem('test-store', JSON.stringify({
        state: { count: 10, oldField: 'old' },
        version: 1
      }))
      
      const { hydrate } = createPersist({
        key: 'test-store',
        version: 2,
        migrate: (state: any, oldVersion: number) => {
          if (oldVersion === 1) {
            // Migration logic
            const { oldField, ...rest } = state
            return { ...rest, newField: 'migrated' }
          }
          return state
        }
      })
      
      const state = hydrate()
      expect(state).toEqual({ count: 10, newField: 'migrated' })
      expect((state as any).oldField).toBeUndefined()
    })

    it('should handle errors during save', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(() => {
          throw new Error('Storage full')
        }),
        removeItem: vi.fn()
      }
      
      const { save } = createPersist({
        key: 'test-store',
        storage: mockStorage
      })
      
      save({ count: 5 })
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[bylyt/state] Failed to persist state:',
        expect.any(Error)
      )
      
      errorSpy.mockRestore()
    })

    it('should handle errors during cleanup', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(() => {
          throw new Error('Cannot remove')
        })
      }
      
      const { cleanup } = createPersist({
        key: 'test-store',
        storage: mockStorage
      })
      
      cleanup()
      
      expect(errorSpy).toHaveBeenCalledWith(
        '[bylyt/state] Failed to cleanup persisted state:',
        expect.any(Error)
      )
      
      errorSpy.mockRestore()
    })
  })

  describe('Store integration', () => {
    it('should persist state automatically', () => {
      const store = createStore(
        { count: 0 },
        { persist: { key: 'auto-persist' } }
      )
      
      store.setState({ count: 5 })
      
      const saved = localStorage.getItem('auto-persist')
      expect(saved).toBeTruthy()
      const parsed = JSON.parse(saved!)
      expect(parsed.state.count).toBe(5)
    })

    it('should hydrate on store creation', () => {
      localStorage.setItem('hydrate-test', JSON.stringify({
        state: { count: 20 },
        version: 1
      }))
      
      const store = createStore(
        { count: 0 },
        { persist: { key: 'hydrate-test' } }
      )
      
      expect(store.getState().count).toBe(20)
    })

    it('should cleanup on store destroy', () => {
      const store = createStore(
        { count: 0 },
        { persist: { key: 'destroy-test' } }
      )
      
      store.setState({ count: 5 })
      expect(localStorage.getItem('destroy-test')).toBeTruthy()
      
      store.destroy()
      expect(localStorage.getItem('destroy-test')).toBeNull()
    })
  })
})
