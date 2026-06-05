import { useEffect, useState, useCallback, useRef } from 'react'
import type { Store } from './types'
import { computed, type Computed } from './computed'
import { subscribeToField } from './field-subscriptions'
import { createAsync, type AsyncState, type AsyncOptions } from './async-state'
import { createOptimisticUpdates } from './optimistic-updates'

/**
 * Hook to use a computed/derived value
 */
export function useComputed<T extends object, R>(
  store: Store<T>,
  selector: (state: T) => R,
  deps: any[] = []
): R {
  const computedRef = useRef<Computed<T, R> | null>(null)

  if (!computedRef.current) {
    computedRef.current = computed(store, selector)
  }

  const [value, setValue] = useState(() => computedRef.current!.get())

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
export function useField<T extends object, K extends keyof T>(
  store: Store<T>,
  field: K
): T[K] {
  const [value, setValue] = useState(() => store.getState()[field])

  useEffect(() => {
    return subscribeToField(store, field as any, (newValue) => {
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
  options: AsyncOptions & { enabled?: boolean } = {}
): {
  data: T[K] extends AsyncState<infer U> ? U | null : never
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
} {
  const { enabled = true, ...asyncOptions } = options
  const asyncManager = useRef(createAsync(store, key)).current

  const state = store.getState()[key] as AsyncState<any>
  const [localState, setLocalState] = useState(state)

  useEffect(() => {
    return store.subscribe((newState) => {
      const asyncState = newState[key] as AsyncState<any>
      setLocalState(asyncState)
    })
  }, [store, key])

  const refetch = useCallback(async () => {
    if (!enabled) return
    try {
      await asyncManager.execute(asyncFn, asyncOptions)
    } catch (err) {
      // Error is already set in state
    }
  }, [enabled, asyncFn, asyncManager, asyncOptions])

  // Auto-fetch on mount if enabled
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
    invalidate: asyncManager.invalidate
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
      asyncAction: () => Promise<R>
    ): Promise<R> => {
      return optimisticManager.optimistic(id, updateFn, asyncAction)
    },
    [optimisticManager]
  )

  return {
    optimistic: optimisticUpdate,
    rollback: optimisticManager.rollback,
    rollbackAll: optimisticManager.rollbackAll,
    isPending: optimisticManager.isPending,
    getPending: optimisticManager.getPending
  }
}

/**
 * Hook to use multiple fields efficiently
 */
export function useFields<T extends object, K extends keyof T>(
  store: Store<T>,
  fields: K[]
): Pick<T, K> {
  const [values, setValues] = useState(() => {
    const state = store.getState()
    return fields.reduce((acc, field) => {
      acc[field] = state[field]
      return acc
    }, {} as Pick<T, K>)
  })

  useEffect(() => {
    return store.subscribe((state) => {
      const newValues = fields.reduce((acc, field) => {
        acc[field] = state[field]
        return acc
      }, {} as Pick<T, K>)

      // Only update if any field actually changed
      const hasChanged = fields.some(field => 
        !Object.is(values[field], newValues[field])
      )

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
export function useBatchedMutations<T extends object>(store: Store<T>) {
  const batch = useCallback((fn: () => void) => {
    // Simple batching using React's automatic batching in React 18+
    fn()
  }, [])

  return { batch }
}
