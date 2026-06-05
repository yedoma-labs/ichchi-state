import type { Middleware, Store } from './types'
import { estimateSize, securityWarn } from './security'

// Logger Middleware
export function logger<T extends object>(options?: {
  collapsed?: boolean
  diff?: boolean
}): Middleware<T> {
  const { collapsed = true, diff = true } = options || {}

  return (store: Store<T>) => (next) => (partial, actionName = 'setState') => {
    const prevState = store.getState()
    
    console.group(
      collapsed ? `%c ${actionName}` : actionName,
      'color: gray; font-weight: lighter'
    )
    console.log('%c prev state', 'color: #9E9E9E; font-weight: bold', prevState)
    console.log('%c action', 'color: #03A9F4; font-weight: bold', { type: actionName, payload: partial })
    
    next(partial, actionName)
    
    const nextState = store.getState()
    console.log('%c next state', 'color: #4CAF50; font-weight: bold', nextState)
    
    if (diff) {
      const changes = Object.keys(nextState).reduce((acc, key) => {
        if (prevState[key as keyof T] !== nextState[key as keyof T]) {
          acc[key] = { from: prevState[key as keyof T], to: nextState[key as keyof T] }
        }
        return acc
      }, {} as Record<string, { from: unknown; to: unknown }>)
      
      if (Object.keys(changes).length > 0) {
        console.log('%c diff', 'color: #FF9800; font-weight: bold', changes)
      }
    }
    
    console.groupEnd()
  }
}

// Thunk Middleware for async actions
export function thunk<T extends object>(): Middleware<T> {
  return (store: Store<T>) => (next) => (partial, actionName) => {
    if (typeof partial === 'function') {
      return (partial as any)(store.getState, store.setState)
    }
    return next(partial, actionName)
  }
}

// Immer-like middleware (simple immutability helper)
export function immer<T extends object>(): Middleware<T> {
  return () => (next) => (partial, actionName) => {
    next(partial, actionName)
  }
}

// Debounce middleware
export function debounce<T extends object>(wait: number): Middleware<T> {
  let timeout: NodeJS.Timeout | null = null

  return () => (next) => (partial, actionName) => {
    if (timeout) clearTimeout(timeout)
    
    timeout = setTimeout(() => {
      next(partial, actionName)
      timeout = null
    }, wait)
  }
}

// Time travel middleware
export function timeTravel<T extends object>(options?: {
  limit?: number
  maxMemoryMB?: number // SECURITY: Memory budget limit
}): Middleware<T> {
  const { limit = 50, maxMemoryMB = 10 } = options || {}
  const history: T[] = []
  let currentIndex = -1
  let totalMemoryBytes = 0
  const maxMemoryBytes = maxMemoryMB * 1024 * 1024

  return (store: Store<T>) => {
    // Store initial state
    history.push(store.getState())
    currentIndex = 0

    // Add travel methods to store
    ;(store as any).undo = () => {
      if (currentIndex > 0) {
        currentIndex--
        const state = history[currentIndex]
        store.setState(state as any, 'TIME_TRAVEL_UNDO')
      }
    }

    ;(store as any).redo = () => {
      if (currentIndex < history.length - 1) {
        currentIndex++
        const state = history[currentIndex]
        store.setState(state as any, 'TIME_TRAVEL_REDO')
      }
    }

    ;(store as any).canUndo = () => currentIndex > 0
    ;(store as any).canRedo = () => currentIndex < history.length - 1

    return (next) => (partial, actionName) => {
      next(partial, actionName)

      // Don't record time travel actions
      if (actionName?.startsWith('TIME_TRAVEL_')) return

      // Clear future history if we're not at the end
      if (currentIndex < history.length - 1) {
        const removed = history.splice(currentIndex + 1)
        // Update memory counter
        removed.forEach(state => {
          totalMemoryBytes -= estimateSize(state)
        })
      }

      const newState = store.getState()
      const stateSize = estimateSize(newState)
      
      // SECURITY: Check memory budget before adding (CWE-770)
      if (totalMemoryBytes + stateSize > maxMemoryBytes) {
        securityWarn(
          `[Security] Time travel memory budget (${maxMemoryMB}MB) exceeded. ` +
          'Consider reducing history limit or state size.'
        )
        // Remove oldest to make room
        if (history.length > 0) {
          const oldest = history.shift()
          if (oldest) totalMemoryBytes -= estimateSize(oldest)
          currentIndex--
        }
      }

      // Add new state to history
      history.push(newState)
      totalMemoryBytes += stateSize
      currentIndex++

      // Limit history size
      if (history.length > limit) {
        const removed = history.shift()
        if (removed) totalMemoryBytes -= estimateSize(removed)
        currentIndex--
      }
    }
  }
}
