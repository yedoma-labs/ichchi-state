import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDevTools } from './devtools'

describe('DevTools', () => {
  describe('createDevTools', () => {
    let mockDevTools: any

    beforeEach(() => {
      mockDevTools = {
        init: vi.fn(),
        send: vi.fn()
      }
    })

    afterEach(() => {
      // Clean up window.__REDUX_DEVTOOLS_EXTENSION__
      if (typeof window !== 'undefined') {
        delete (window as any).__REDUX_DEVTOOLS_EXTENSION__
      }
    })

    it('should return null when window is undefined (SSR)', () => {
      const result = createDevTools('test')
      expect(result).toBeNull()
    })

    it('should return null when extension is not available', () => {
      // Extension not set up
      const result = createDevTools('test')
      expect(result).toBeNull()
    })

    it('should create devtools connection when extension is available', () => {
      // Mock the extension
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const result = createDevTools('MyStore')

      expect(result).not.toBeNull()
      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalledWith({
        name: 'MyStore'
      })
    })

    it('should expose init method', () => {
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const devtools = createDevTools('MyStore')
      const initialState = { count: 0 }

      devtools?.init(initialState)

      expect(mockDevTools.init).toHaveBeenCalledWith(initialState)
    })

    it('should expose send method', () => {
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const devtools = createDevTools('MyStore')
      const action = { type: 'INCREMENT', payload: 1 }
      const state = { count: 1 }

      devtools?.send(action, state)

      expect(mockDevTools.send).toHaveBeenCalledWith(action, state)
    })

    it('should send action without payload', () => {
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const devtools = createDevTools('MyStore')
      const action = { type: 'RESET' }
      const state = { count: 0 }

      devtools?.send(action, state)

      expect(mockDevTools.send).toHaveBeenCalledWith(action, state)
    })

    it('should handle multiple store connections', () => {
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const devtools1 = createDevTools('Store1')
      const devtools2 = createDevTools('Store2')

      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalledTimes(2)
      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalledWith({
        name: 'Store1'
      })
      expect((window as any).__REDUX_DEVTOOLS_EXTENSION__.connect).toHaveBeenCalledWith({
        name: 'Store2'
      })
    })

    it('should handle complex state objects', () => {
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const devtools = createDevTools('MyStore')
      const complexState = {
        users: [{ id: 1, name: 'Alice' }],
        settings: { theme: 'dark', nested: { deep: true } }
      }

      devtools?.init(complexState)

      expect(mockDevTools.init).toHaveBeenCalledWith(complexState)
    })

    it('should handle actions with complex payloads', () => {
      ;(window as any).__REDUX_DEVTOOLS_EXTENSION__ = {
        connect: vi.fn(() => mockDevTools)
      }

      const devtools = createDevTools('MyStore')
      const action = {
        type: 'ADD_USER',
        payload: { id: 1, name: 'Alice', metadata: { role: 'admin' } }
      }
      const state = { users: [] }

      devtools?.send(action, state)

      expect(mockDevTools.send).toHaveBeenCalledWith(action, state)
    })
  })
})
