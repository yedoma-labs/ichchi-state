/**
 * Global test setup
 */
import '@testing-library/jest-dom'
import { beforeAll, afterEach, vi } from 'vitest'

// Mock Storage for environments where it's not available
class MockStorage implements Storage {
  private store: Map<string, string> = new Map()
  
  get length(): number {
    return this.store.size
  }
  
  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }
  
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  
  removeItem(key: string): void {
    this.store.delete(key)
  }
  
  clear(): void {
    this.store.clear()
  }
  
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
}

// Ensure global DOM objects are available
beforeAll(() => {
  // happy-dom should provide these, but ensure they exist
  if (typeof document === 'undefined') {
    throw new Error('document is not defined - happy-dom may not be loaded properly')
  }
  if (typeof window === 'undefined') {
    throw new Error('window is not defined - happy-dom may not be loaded properly')
  }
  
  // Polyfill localStorage/sessionStorage if not available
  if (typeof localStorage === 'undefined') {
    Object.defineProperty(globalThis, 'localStorage', {
      value: new MockStorage(),
      writable: true,
      configurable: true
    })
  }
  if (typeof sessionStorage === 'undefined') {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: new MockStorage(),
      writable: true,
      configurable: true
    })
  }
})

// Mock crypto.randomUUID for tests
if (typeof crypto === 'undefined') {
  (globalThis as any).crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  }
}

// Clean up after each test
afterEach(() => {
  // Clear any timers
  vi.clearAllTimers()
})
