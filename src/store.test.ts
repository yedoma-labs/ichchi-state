import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createStore, applyMiddleware } from './store'
import type { Middleware } from './types'

describe('createStore', () => {
  it('should create a store with initial state', () => {
    const store = createStore({ count: 0 })
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('should update state', () => {
    const store = createStore({ count: 0 })
    store.setState({ count: 1 })
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('should update state with function', () => {
    const store = createStore({ count: 0 })
    store.setState((state) => ({ count: state.count + 1 }))
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('should notify listeners', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    
    store.subscribe(listener)
    store.setState({ count: 1 })
    
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 })
  })

  it('should unsubscribe listeners', () => {
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.setState({ count: 1 })
    
    expect(listener).not.toHaveBeenCalled()
  })

  it('should merge state partially', () => {
    const store = createStore({ count: 0, name: 'test' })
    store.setState({ count: 1 })
    expect(store.getState()).toEqual({ count: 1, name: 'test' })
  })

  it('should handle multiple subscribers', () => {
    const store = createStore({ count: 0 })
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    const listener3 = vi.fn()
    
    store.subscribe(listener1)
    store.subscribe(listener2)
    store.subscribe(listener3)
    
    store.setState({ count: 1 })
    
    expect(listener1).toHaveBeenCalledWith({ count: 1 }, { count: 0 })
    expect(listener2).toHaveBeenCalledWith({ count: 1 }, { count: 0 })
    expect(listener3).toHaveBeenCalledWith({ count: 1 }, { count: 0 })
  })

  it('should clear all listeners on destroy', () => {
    const store = createStore({ count: 0 })
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    
    store.subscribe(listener1)
    store.subscribe(listener2)
    
    store.destroy()
    store.setState({ count: 1 })
    
    expect(listener1).not.toHaveBeenCalled()
    expect(listener2).not.toHaveBeenCalled()
  })

  it('should handle complex nested state', () => {
    const store = createStore({
      user: {
        profile: {
          name: 'Alice',
          settings: {
            theme: 'dark'
          }
        }
      }
    })

    store.setState({
      user: {
        profile: {
          name: 'Bob',
          settings: {
            theme: 'light'
          }
        }
      }
    })

    expect(store.getState().user.profile.name).toBe('Bob')
    expect(store.getState().user.profile.settings.theme).toBe('light')
  })

  it('should handle empty state', () => {
    const store = createStore({})
    expect(store.getState()).toEqual({})
    
    store.setState({} as any)
    expect(store.getState()).toEqual({})
  })

  it('should work without config', () => {
    const store = createStore({ count: 0 })
    expect(store.getState()).toEqual({ count: 0 })
  })

  it('should work with devtools config', () => {
    const store = createStore(
      { count: 0 },
      { devtools: true, name: 'TestStore' }
    )
    
    store.setState({ count: 1 })
    expect(store.getState().count).toBe(1)
  })

  it('should not initialize devtools in non-browser environment', () => {
    const originalWindow = global.window
    // @ts-ignore
    delete global.window

    const store = createStore(
      { count: 0 },
      { devtools: true }
    )
    
    // Should still work without devtools
    store.setState({ count: 1 })
    expect(store.getState().count).toBe(1)

    global.window = originalWindow
  })
})

describe('applyMiddleware', () => {
  it('should apply middleware', () => {
    const calls: string[] = []
    
    const middleware1: Middleware<{ count: number }> = () => (next) => (partial, actionName) => {
      calls.push('middleware1')
      next(partial, actionName)
    }
    
    const middleware2: Middleware<{ count: number }> = () => (next) => (partial, actionName) => {
      calls.push('middleware2')
      next(partial, actionName)
    }
    
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, middleware1, middleware2)
    
    enhancedStore.setState({ count: 1 })
    
    // Middlewares are applied in reverse order (last wraps first)
    expect(calls).toEqual(['middleware2', 'middleware1'])
    expect(enhancedStore.getState()).toEqual({ count: 1 })
  })
})
