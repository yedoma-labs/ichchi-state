import { useCallback, useEffect, useRef, useState } from 'react'
import { type AsyncOptions, type AsyncState, createAsync } from './async-state'
import { type Computed, computed } from './computed'
import { subscribeToField } from './field-subscriptions'
import { createOptimisticUpdates } from './optimistic-updates'
import type { Store } from './types'

/**
 * Hook to use a computed/derived value
 */
export function useComputed<T extends object, R>(
  store: Store<T>,
  selector: (state: T) => R,
  // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
  deps: any[] = [],
): R {
  const computedRef = useRef<Computed<T, R> | null>(null)

  if (!computedRef.current) {
    computedRef.current = computed(store, selector)
  }

  // biome-ignore lint/style/noNonNullAssertion: value is initialized before use
  const [value, setValue] = useState(() => computedRef.current!.get())

  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list is controlled by the caller
  useEffect(() => {
    // Recreate computed if deps change
    computedRef.current = computed(store, selector)
    setValue(computedRef.current.get())

    const unsubscribe = computedRef.current.subscribe(setValue)
    return unsubscribe
  }, [store, ...deps])

  return value
}

/**
 * Hook to subscribe to a specific field
 */
export function useField<T extends object, K extends keyof T>(store: Store<T>, field: K): T[K] {
  const [value, setValue] = useState(() => store.getState()[field])

  useEffect(() => {
    // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
    return subscribeToField(store, field as any, (newValue) => {
      // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
      setValue(newValue as any)
    })
  }, [store, field])

  return value
}

/**
 * Hook for async state management
 */
export function useAsync<T extends object, K extends keyof T>(
  store: Store<T>,
  key: K,
  asyncFn: () => Promise<T[K] extends AsyncState<infer U> ? U : never>,
  options: AsyncOptions & { enabled?: boolean } = {},
): {
  data: T[K] extends AsyncState<infer U> ? U | null : never
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
} {
  const { enabled = true, ...asyncOptions } = options
  const asyncManager = useRef(createAsync(store, key)).current

  // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
  const state = store.getState()[key] as AsyncState<any>
  const [localState, setLocalState] = useState(state)

  useEffect(() => {
    return store.subscribe((newState) => {
      // biome-ignore lint/suspicious/noExplicitAny: generic payload types are intentionally open
      const asyncState = newState[key] as AsyncState<any>
      setLocalState(asyncState)
    })
  }, [store, key])

  const refetch = useCallback(async () => {
    if (!enabled) return
    try {
      await asyncManager.execute(asyncFn, asyncOptions)
    } catch (_err) {
      // Error is already set in state
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list is controlled by the caller
  }, [enabled, asyncFn, asyncManager, asyncOptions])

  // Auto-fetch on mount if enabled
  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list is controlled by the caller
  useEffect(() => {
    if (enabled && !localState?.data && !localState?.loading) {
      refetch()
    }
  }, [enabled])

  return {
    data: localState?.data || null,
    loading: localState?.loading || false,
    error: localState?.error || null,
    refetch,
    invalidate: asyncManager.invalidate,
  }
}

/**
 * Hook for optimistic updates
 */
export function useOptimistic<T extends object>(store: Store<T>) {
  const optimisticManager = useRef(createOptimisticUpdates(store)).current

  const optimisticUpdate = useCallback(
    async <R>(
      id: string,
      updateFn: (state: T) => Partial<T>,
      asyncAction: () => Promise<R>,
    ): Promise<R> => {
      return optimisticManager.optimistic(id, updateFn, asyncAction)
    },
    [optimisticManager],
  )

  return {
    optimistic: optimisticUpdate,
    rollback: optimisticManager.rollback,
    rollbackAll: optimisticManager.rollbackAll,
    isPending: optimisticManager.isPending,
    getPending: optimisticManager.getPending,
  }
}

/**
 * Hook to use multiple fields efficiently
 */
export function useFields<T extends object, K extends keyof T>(
  store: Store<T>,
  fields: K[],
): Pick<T, K> {
  const [values, setValues] = useState(() => {
    const state = store.getState()
    return fields.reduce(
      (acc, field) => {
        acc[field] = state[field]
        return acc
      },
      {} as Pick<T, K>,
    )
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: dependency list is controlled by the caller
  useEffect(() => {
    return store.subscribe((state) => {
      const newValues = fields.reduce(
        (acc, field) => {
          acc[field] = state[field]
          return acc
        },
        {} as Pick<T, K>,
      )

      // Only update if any field actually changed
      const hasChanged = fields.some((field) => !Object.is(values[field], newValues[field]))

      if (hasChanged) {
        setValues(newValues)
      }
    })
  }, [store, fields.join(',')])

  return values
}

/**
 * Hook for batched mutations
 */
export function useBatchedMutations<T extends object>(_store: Store<T>) {
  const batch = useCallback((fn: () => void) => {
    // Simple batching using React's automatic batching in React 18+
    fn()
  }, [])

  return { batch }
}
