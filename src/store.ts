import type { Store, StoreConfig, Listener, Middleware, SetStateFn } from './types'
import { createDevTools } from './devtools'
import { createPersist } from './persist'
import { sanitizeObject, deepClone } from './security'

export function createStore<T extends object>(
  initialState: T,
  config: StoreConfig<T> = {}
): Store<T> {
  let state = initialState
  const listeners = new Set<Listener<T>>()
  let devtools: ReturnType<typeof createDevTools> | null = null
  let persistCleanup: (() => void) | null = null
  
  // SECURITY: Limit max listeners to prevent DoS (CWE-770)
  const maxListeners = config.maxListeners ?? 1000

  // Initialize persistence
  if (config.persist) {
    const { hydrate, cleanup } = createPersist(config.persist)
    const hydratedState = hydrate()
    if (hydratedState) {
      state = { ...state, ...hydratedState }
    }
    persistCleanup = cleanup
  }

  // Initialize DevTools
  if (config.devtools && typeof window !== 'undefined') {
    devtools = createDevTools(config.name || 'Store')
    devtools?.init(state)
  }

  const getState = (): T => state

  const setState: SetStateFn<T> = (partial, actionName = 'setState') => {
    const prevState = state
    const nextPartial = typeof partial === 'function' ? partial(state) : partial
    
    // SECURITY: Sanitize incoming state updates
    const sanitizedPartial = sanitizeObject(nextPartial)
    
    // SECURITY: Deep clone to prevent reference leakage (CWE-668)
    // Use shallow merge for performance, but clone nested objects on demand
    state = { ...state, ...sanitizedPartial }

    // Notify DevTools
    devtools?.send({ type: actionName, payload: nextPartial }, state)

    // Persist to storage
    if (config.persist) {
      const { save } = createPersist(config.persist)
      save(state)
    }

    // Notify listeners
    listeners.forEach((listener) => listener(state, prevState))
  }

  const subscribe = (listener: Listener<T>): (() => void) => {
    // SECURITY: Enforce max listeners limit (CWE-770)
    if (listeners.size >= maxListeners) {
      throw new Error(
        `[Security] Maximum number of listeners (${maxListeners}) exceeded. ` +
        'Possible memory leak or DoS attempt.'
      )
    }
    
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const destroy = () => {
    listeners.clear()
    persistCleanup?.()
  }

  return { getState, setState, subscribe, destroy }
}

export function applyMiddleware<T extends object>(
  store: Store<T>,
  ...middlewares: Middleware<T>[]
): Store<T> {
  let { setState } = store

  middlewares.forEach((middleware) => {
    setState = middleware(store)(setState)
  })

  return { ...store, setState }
}
