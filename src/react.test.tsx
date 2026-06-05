import { describe, it, expect, vi } from 'vitest'
import { createStore } from './store'
import { useStore } from './react'
import { useState, useEffect } from 'react'

// Mock React hooks for testing
let mockState: any
let mockSetState: any
let mockCleanup: (() => void) | null = null

vi.mock('react', () => ({
  useState: vi.fn((initial) => {
    mockState = typeof initial === 'function' ? initial() : initial
    mockSetState = vi.fn((newState) => {
      mockState = typeof newState === 'function' ? newState(mockState) : newState
    })
    return [mockState, mockSetState]
  }),
  useEffect: vi.fn((effect) => {
    mockCleanup = effect()
  }),
  useSyncExternalStore: vi.fn((subscribe, getSnapshot) => {
    // Simple implementation for testing
    return getSnapshot()
  })
}))

describe('React Integration', () => {
  describe('useStore', () => {
    it('should export useStore hook', () => {
      expect(useStore).toBeDefined()
      expect(typeof useStore).toBe('function')
    })

    it('should return store state', () => {
      const store = createStore({ count: 0, name: 'test' })
      
      // Simulate hook call
      const result = store.getState()
      
      expect(result).toEqual({ count: 0, name: 'test' })
    })

    it('should handle store updates', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      
      store.subscribe(listener)
      store.setState({ count: 1 })
      
      expect(listener).toHaveBeenCalled()
      expect(store.getState().count).toBe(1)
    })

    it('should allow selecting specific state', () => {
      const store = createStore({ count: 0, name: 'test' })
      
      // Simulate selector
      const selector = (state: typeof store extends { getState(): infer S } ? S : never) => state.count * 2
      const result = selector(store.getState())
      
      expect(result).toBe(0)
      
      store.setState({ count: 5 })
      expect(selector(store.getState())).toBe(10)
    })

    it('should unsubscribe properly', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()
      
      const unsubscribe = store.subscribe(listener)
      unsubscribe()
      
      store.setState({ count: 1 })
      expect(listener).not.toHaveBeenCalled()
    })
  })
})
