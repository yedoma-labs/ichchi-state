import React, { useEffect, useState, useSyncExternalStore } from 'react'
import type { Store, Selector } from './types'

// Export advanced hooks
export { 
  useComputed, 
  useField, 
  useFields,
  useAsync, 
  useOptimistic,
  useBatchedMutations 
} from './react-advanced'

/**
 * Hook to use the entire store state
 */
export function useStore<T extends object>(store: Store<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState
  )
}

/**
 * Hook to use a slice of the store with a selector
 */
export function useStoreSelector<T extends object, R>(
  store: Store<T>,
  selector: Selector<T, R>,
  equalityFn: (a: R, b: R) => boolean = Object.is
): R {
  const [selectedState, setSelectedState] = useState(() => selector(store.getState()))

  useEffect(() => {
    const checkForUpdates = () => {
      const nextSelectedState = selector(store.getState())
      if (!equalityFn(selectedState, nextSelectedState)) {
        setSelectedState(nextSelectedState)
      }
    }

    const unsubscribe = store.subscribe(checkForUpdates)
    checkForUpdates() // Check for updates on mount

    return unsubscribe
  }, [store, selector, equalityFn, selectedState])

  return selectedState
}

/**
 * Create a React context provider for the store
 */
export function createStoreContext<T extends object>(store: Store<T>) {
  const StoreContext = React.createContext<Store<T> | null>(null)

  const Provider = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(StoreContext.Provider, { value: store }, children)
  }

  const useStoreContext = (): T => {
    const store = React.useContext(StoreContext)
    if (!store) {
      throw new Error('useStoreContext must be used within a Provider')
    }
    return useStore(store)
  }

  const useStoreSelectorContext = <R extends unknown>(
    selector: Selector<T, R>,
    equalityFn?: (a: R, b: R) => boolean
  ): R => {
    const store = React.useContext(StoreContext)
    if (!store) {
      throw new Error('useStoreSelectorContext must be used within a Provider')
    }
    return useStoreSelector(store, selector, equalityFn)
  }

  return {
    Provider,
    useStore: useStoreContext,
    useSelector: useStoreSelectorContext,
  }
}


