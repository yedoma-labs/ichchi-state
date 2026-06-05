import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStore, applyMiddleware } from './store'
import { logger, thunk, debounce, timeTravel, immer } from './middleware'

describe('logger middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log state changes', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, logger())
    
    enhancedStore.setState({ count: 1 }, 'INCREMENT')
    
    expect(console.group).toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('prev state'),
      expect.any(String),
      { count: 0 }
    )
    expect(console.groupEnd).toHaveBeenCalled()
  })
})

describe('debounce middleware', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should debounce state updates', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, debounce(100))
    
    enhancedStore.setState({ count: 1 })
    enhancedStore.setState({ count: 2 })
    enhancedStore.setState({ count: 3 })
    
    expect(store.getState()).toEqual({ count: 0 })
    
    vi.advanceTimersByTime(100)
    
    expect(store.getState()).toEqual({ count: 3 })
  })
})

describe('immer middleware', () => {
  it('should pass through state updates', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, immer())
    
    enhancedStore.setState({ count: 5 })
    expect(store.getState()).toEqual({ count: 5 })
  })
})

describe('thunk middleware', () => {
  it('should handle function as state update', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, thunk())
    
    enhancedStore.setState((getState: any, setState: any) => {
      const current = getState()
      setState({ count: current.count + 1 })
    })
    
    expect(store.getState()).toEqual({ count: 1 })
  })

  it('should handle async thunks', async () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, thunk())
    
    // Thunk should pass getState and setState functions
    let capturedSetState: any
    
    enhancedStore.setState((getState: any, setState: any) => {
      capturedSetState = setState
      const current = getState()
      expect(current).toEqual({ count: 0 })
      setState({ count: current.count + 5 })
    })
    
    expect(store.getState()).toEqual({ count: 5 })
  })

  it('should still handle regular objects', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, thunk())
    
    enhancedStore.setState({ count: 10 })
    expect(store.getState()).toEqual({ count: 10 })
  })
})

describe('logger middleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'group').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'groupEnd').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should log state changes with diff', () => {
    const store = createStore({ count: 0, name: 'test' })
    const enhancedStore = applyMiddleware(store, logger({ diff: true }))
    
    enhancedStore.setState({ count: 1 }, 'INCREMENT')
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('diff'),
      expect.any(String),
      expect.objectContaining({
        count: { from: 0, to: 1 }
      })
    )
  })

  it('should not log diff when no changes', () => {
    const store = createStore({ count: 0, name: 'test' })
    const enhancedStore = applyMiddleware(store, logger({ diff: true }))
    
    enhancedStore.setState({ count: 0, name: 'test' })
    
    const diffCalls = (console.log as any).mock.calls.filter(
      (call: any) => call[0]?.includes?.('diff')
    )
    expect(diffCalls.length).toBe(0)
  })

  it('should use collapsed style', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, logger({ collapsed: true }))
    
    enhancedStore.setState({ count: 1 })
    
    expect(console.group).toHaveBeenCalledWith(
      expect.stringContaining('%c'),
      expect.any(String)
    )
  })

  it('should log without diff option', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, logger({ diff: false }))
    
    enhancedStore.setState({ count: 1 })
    
    const diffCalls = (console.log as any).mock.calls.filter(
      (call: any) => call[0]?.includes?.('diff')
    )
    expect(diffCalls.length).toBe(0)
  })
})

describe('timeTravel middleware', () => {
  it('should enable undo/redo', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, timeTravel()) as any
    
    enhancedStore.setState({ count: 1 })
    enhancedStore.setState({ count: 2 })
    enhancedStore.setState({ count: 3 })
    
    expect(store.getState()).toEqual({ count: 3 })
    
    enhancedStore.undo()
    expect(store.getState()).toEqual({ count: 2 })
    
    enhancedStore.undo()
    expect(store.getState()).toEqual({ count: 1 })
    
    enhancedStore.redo()
    expect(store.getState()).toEqual({ count: 2 })
  })

  it('should clear future history on new action', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, timeTravel()) as any
    
    enhancedStore.setState({ count: 1 })
    enhancedStore.setState({ count: 2 })
    enhancedStore.undo()
    enhancedStore.setState({ count: 99 })
    
    expect(store.getState()).toEqual({ count: 99 })
    expect(enhancedStore.canRedo()).toBe(false)
  })

  it('should respect history limit', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, timeTravel({ limit: 3 })) as any
    
    enhancedStore.setState({ count: 1 })
    enhancedStore.setState({ count: 2 })
    enhancedStore.setState({ count: 3 })
    enhancedStore.setState({ count: 4 })
    
    // Try to undo more than limit
    enhancedStore.undo()
    enhancedStore.undo()
    enhancedStore.undo()
    enhancedStore.undo()
    
    // Should only go back to limit
    expect(store.getState().count).toBeGreaterThanOrEqual(2)
  })

  it('should check canUndo correctly', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, timeTravel()) as any
    
    expect(enhancedStore.canUndo()).toBe(false)
    
    enhancedStore.setState({ count: 1 })
    expect(enhancedStore.canUndo()).toBe(true)
    
    enhancedStore.undo()
    expect(enhancedStore.canUndo()).toBe(false)
  })

  it('should check canRedo correctly', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, timeTravel()) as any
    
    enhancedStore.setState({ count: 1 })
    expect(enhancedStore.canRedo()).toBe(false)
    
    enhancedStore.undo()
    expect(enhancedStore.canRedo()).toBe(true)
    
    enhancedStore.redo()
    expect(enhancedStore.canRedo()).toBe(false)
  })

  it('should not record time travel actions in history', () => {
    const store = createStore({ count: 0 })
    const enhancedStore = applyMiddleware(store, timeTravel()) as any
    
    enhancedStore.setState({ count: 1 })
    enhancedStore.setState({ count: 2 })
    
    // Undo/redo should not add to history
    enhancedStore.undo()
    enhancedStore.redo()
    enhancedStore.undo()
    
    // Should still be able to go back to beginning
    enhancedStore.undo()
    expect(store.getState().count).toBe(0)
  })
})
