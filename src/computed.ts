import type { Store } from './types'

export interface ComputedOptions {
  // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
  equals?: (a: any, b: any) => boolean
}

export interface Computed<_T, R> {
  get: () => R
  subscribe: (listener: (value: R) => void) => () => void
}

/**
 * Create a computed/derived value that auto-updates when dependencies change
 */
export function computed<T extends object, R>(
  store: Store<T>,
  selector: (state: T) => R,
  options: ComputedOptions = {},
): Computed<T, R> {
  const { equals = Object.is } = options

  let cachedValue = selector(store.getState())
  const listeners = new Set<(value: R) => void>()
  // The store subscription only exists while at least one listener is attached.
  let unsubscribeFromStore: (() => void) | null = null

  const attachToStore = () => {
    // State may have changed while detached, so refresh the cache before listening again.
    cachedValue = selector(store.getState())
    unsubscribeFromStore = store.subscribe((state) => {
      const nextValue = selector(state)
      if (!equals(cachedValue, nextValue)) {
        cachedValue = nextValue
        // biome-ignore lint/suspicious/useIterableCallbackReturn: callback result is intentionally ignored
        listeners.forEach((listener) => listener(cachedValue))
      }
    })
  }

  const detachFromStore = () => {
    unsubscribeFromStore?.()
    unsubscribeFromStore = null
  }

  attachToStore()

  return {
    get: () => cachedValue,
    subscribe: (listener) => {
      if (!unsubscribeFromStore) {
        attachToStore()
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          detachFromStore()
        }
      }
    },
  }
}

/**
 * Create multiple computed values at once
 */
// biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
export function computedMap<T extends object, R extends Record<string, any>>(
  store: Store<T>,
  selectors: { [K in keyof R]: (state: T) => R[K] },
): { [K in keyof R]: Computed<T, R[K]> } {
  return Object.entries(selectors).reduce((acc, [key, selector]) => {
    // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
    acc[key as keyof R] = computed(store, selector as any)
    return acc
    // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
  }, {} as any)
}
