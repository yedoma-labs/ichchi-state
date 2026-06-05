import type { Store } from './types'

export interface ComputedOptions {
  equals?: (a: any, b: any) => boolean
}

export interface Computed<T, R> {
  get: () => R
  subscribe: (listener: (value: R) => void) => () => void
}

/**
 * Create a computed/derived value that auto-updates when dependencies change
 */
export function computed<T extends object, R>(
  store: Store<T>,
  selector: (state: T) => R,
  options: ComputedOptions = {}
): Computed<T, R> {
  const { equals = Object.is } = options
  
  let cachedValue = selector(store.getState())
  const listeners = new Set<(value: R) => void>()

  const unsubscribe = store.subscribe((state) => {
    const nextValue = selector(state)
    if (!equals(cachedValue, nextValue)) {
      cachedValue = nextValue
      listeners.forEach(listener => listener(cachedValue))
    }
  })

  return {
    get: () => cachedValue,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          unsubscribe()
        }
      }
    }
  }
}

/**
 * Create multiple computed values at once
 */
export function computedMap<T extends object, R extends Record<string, any>>(
  store: Store<T>,
  selectors: { [K in keyof R]: (state: T) => R[K] }
): { [K in keyof R]: Computed<T, R[K]> } {
  return Object.entries(selectors).reduce((acc, [key, selector]) => {
    acc[key as keyof R] = computed(store, selector as any)
    return acc
  }, {} as any)
}
