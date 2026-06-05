import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createStore } from './store'
import { crossTabSync } from './cross-tab-sync'

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  private static channels: Map<string, MockBroadcastChannel[]> = new Map()

  constructor(name: string) {
    this.name = name
    const channels = MockBroadcastChannel.channels.get(name) || []
    channels.push(this)
    MockBroadcastChannel.channels.set(name, channels)
  }

  postMessage(data: any) {
    const channels = MockBroadcastChannel.channels.get(this.name) || []
    channels.forEach(channel => {
      if (channel !== this && channel.onmessage) {
        channel.onmessage(new MessageEvent('message', { data }))
      }
    })
  }

  close() {
    const channels = MockBroadcastChannel.channels.get(this.name) || []
    const index = channels.indexOf(this)
    if (index > -1) {
      channels.splice(index, 1)
    }
  }

  static clearAll() {
    this.channels.clear()
  }
}

Object.defineProperty(global, 'BroadcastChannel', {
  value: MockBroadcastChannel,
  writable: true
})

describe('Cross-tab synchronization', () => {
  beforeEach(() => {
    MockBroadcastChannel.clearAll()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    MockBroadcastChannel.clearAll()
    vi.restoreAllMocks()
  })

  it('should sync state via localStorage', async () => {
    const store1 = createStore({ count: 0 })
    const store2 = createStore({ count: 0 })

    const cleanup1 = crossTabSync(store1, { key: 'test-sync' })
    const cleanup2 = crossTabSync(store2, { key: 'test-sync' })

    // Update store1
    store1.setState({ count: 5 })

    // Wait for sync delay
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check localStorage was updated
    const stored = localStorage.getItem('test-sync')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).count).toBe(5)

    cleanup1()
    cleanup2()
  })

  it('should handle storage with filter', async () => {
    const store = createStore({ count: 0, secret: 'hidden' })

    const cleanup = crossTabSync(store, { 
      key: 'filtered-sync',
      filter: (state) => ({ count: state.count })
    })

    store.setState({ count: 5, secret: 'still hidden' })

    // Wait for sync delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const stored = localStorage.getItem('filtered-sync')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed.count).toBe(5)
    expect(parsed.secret).toBeUndefined()

    cleanup()
  })

  it('should cleanup on destroy', async () => {
    const store = createStore({ count: 0 })
    const cleanup = crossTabSync(store, { key: 'cleanup-test' })

    store.setState({ count: 5 })
    
    // Wait for sync
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(localStorage.getItem('cleanup-test')).toBeTruthy()

    cleanup()

    // Further updates should not sync
    localStorage.removeItem('cleanup-test')
    store.setState({ count: 10 })
    await new Promise(resolve => setTimeout(resolve, 100))
    
    expect(store.getState().count).toBe(10)
  })

  it('should use custom sync delay', async () => {
    const store = createStore({ count: 0 })
    const cleanup = crossTabSync(store, { 
      key: 'delay-test',
      syncDelay: 10
    })

    store.setState({ count: 5 })
    
    // Should sync quickly with shorter delay
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(localStorage.getItem('delay-test')).toBeTruthy()

    cleanup()
  })

  it('should handle multiple keys independently', async () => {
    const storeA = createStore({ value: 0 })
    const storeB = createStore({ value: 0 })

    const cleanupA = crossTabSync(storeA, { key: 'store-a' })
    const cleanupB = crossTabSync(storeB, { key: 'store-b' })

    storeA.setState({ value: 1 })
    storeB.setState({ value: 2 })

    await new Promise(resolve => setTimeout(resolve, 100))

    const storedA = localStorage.getItem('store-a')
    const storedB = localStorage.getItem('store-b')
    
    expect(storedA).toBeTruthy()
    expect(storedB).toBeTruthy()
    expect(JSON.parse(storedA!).value).toBe(1)
    expect(JSON.parse(storedB!).value).toBe(2)

    cleanupA()
    cleanupB()
  })

  it('should handle incoming storage events from other tabs', async () => {
    const store1 = createStore({ count: 0 })
    const store2 = createStore({ count: 0 })

    const cleanup1 = crossTabSync(store1, { key: 'sync-event-test' })
    const cleanup2 = crossTabSync(store2, { key: 'sync-event-test' })

    // Simulate storage event from another tab
    const storageEvent = new StorageEvent('storage', {
      key: 'sync-event-test',
      newValue: JSON.stringify({ count: 42 }),
      oldValue: JSON.stringify({ count: 0 })
    })

    window.dispatchEvent(storageEvent)

    // Wait a bit for event to be processed
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(store1.getState().count).toBe(42)
    expect(store2.getState().count).toBe(42)

    cleanup1()
    cleanup2()
  })

  it('should ignore storage events with wrong key', async () => {
    const store = createStore({ count: 0 })
    const cleanup = crossTabSync(store, { key: 'correct-key' })

    const storageEvent = new StorageEvent('storage', {
      key: 'wrong-key',
      newValue: JSON.stringify({ count: 99 })
    })

    window.dispatchEvent(storageEvent)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(store.getState().count).toBe(0)

    cleanup()
  })

  it('should ignore storage events without newValue', async () => {
    const store = createStore({ count: 0 })
    const cleanup = crossTabSync(store, { key: 'test-key' })

    const storageEvent = new StorageEvent('storage', {
      key: 'test-key',
      newValue: null
    })

    window.dispatchEvent(storageEvent)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(store.getState().count).toBe(0)

    cleanup()
  })

  it('should handle invalid JSON in storage event', async () => {
    const store = createStore({ count: 0 })
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const cleanup = crossTabSync(store, { key: 'test-key' })

    const storageEvent = new StorageEvent('storage', {
      key: 'test-key',
      newValue: 'invalid json {'
    })

    window.dispatchEvent(storageEvent)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Error comes from safeJSONParse now
    expect(errorSpy).toHaveBeenCalled()
    const hasJSONError = (errorSpy.mock.calls as any).some((call: any) =>
      call[0]?.includes('JSON.parse failed')
    )
    expect(hasJSONError).toBe(true)
    expect(store.getState().count).toBe(0)

    errorSpy.mockRestore()
    cleanup()
  })

  it('should handle errors when broadcasting state', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Create a custom storage that throws on setItem
    const mockStorage = {
      getItem: (key: string) => localStorage.getItem(key),
      setItem: () => {
        throw new Error('Storage full')
      },
      removeItem: (key: string) => localStorage.removeItem(key)
    }
    
    const store = createStore({ count: 0 })
    const cleanup = crossTabSync(store, {
      key: 'test-key',
      syncDelay: 10
    })

    // Temporarily override localStorage to use mockStorage
    const originalStorage = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true
    })

    store.setState({ count: 5 })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(errorSpy).toHaveBeenCalledWith(
      'Failed to broadcast state to other tabs:',
      expect.any(Error)
    )

    Object.defineProperty(global, 'localStorage', {
      value: originalStorage,
      writable: true
    })
    errorSpy.mockRestore()
    cleanup()
  })

  it('should return noop in non-browser environment', () => {
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    const store = createStore({ count: 0 })
    const cleanup = crossTabSync(store, { key: 'test-key' })

    // Should not throw
    cleanup()

    global.window = originalWindow
  })
})
