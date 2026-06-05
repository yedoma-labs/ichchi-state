import type { Store } from './types'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  timestamp: number | null
}

export interface AsyncOptions {
  staleTime?: number
  cacheTime?: number
  retry?: number
  retryDelay?: number
}

/**
 * Create async state manager with built-in loading/error handling
 * Similar to React Query but simpler and integrated with the store
 */
export function createAsync<T extends object, K extends keyof T>(
  store: Store<T>,
  key: K
) {
  type DataType = T[K] extends AsyncState<infer U> ? U : never

  return {
    /**
     * Execute an async action with automatic loading/error state
     */
    async execute(
      asyncFn: () => Promise<DataType>,
      options: AsyncOptions = {}
    ): Promise<DataType> {
      const { retry = 0, retryDelay = 1000, staleTime = 0 } = options

      // Check if data is fresh
      const currentState = store.getState()[key] as AsyncState<DataType>
      if (
        currentState?.data &&
        currentState.timestamp &&
        Date.now() - currentState.timestamp < staleTime
      ) {
        return currentState.data
      }

      // Set loading state
      store.setState({
        [key]: {
          data: currentState?.data || null,
          loading: true,
          error: null,
          timestamp: currentState?.timestamp || null
        }
      } as any, `ASYNC_${String(key)}_LOADING`)

      let lastError: Error | null = null
      let attempts = 0

      while (attempts <= retry) {
        try {
          const data = await asyncFn()

          // Set success state
          store.setState({
            [key]: {
              data,
              loading: false,
              error: null,
              timestamp: Date.now()
            }
          } as any, `ASYNC_${String(key)}_SUCCESS`)

          return data
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          attempts++

          if (attempts <= retry) {
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
      }

      // Set error state
      store.setState({
        [key]: {
          data: currentState?.data || null,
          loading: false,
          error: lastError,
          timestamp: currentState?.timestamp || null
        }
      } as any, `ASYNC_${String(key)}_ERROR`)

      throw lastError
    },

    /**
     * Invalidate cached data
     */
    invalidate(): void {
      const currentState = store.getState()[key] as AsyncState<DataType>
      store.setState({
        [key]: {
          ...currentState,
          timestamp: null
        }
      } as any, `ASYNC_${String(key)}_INVALIDATE`)
    },

    /**
     * Reset to initial state
     */
    reset(): void {
      store.setState({
        [key]: {
          data: null,
          loading: false,
          error: null,
          timestamp: null
        }
      } as any, `ASYNC_${String(key)}_RESET`)
    },

    /**
     * Mutate data optimistically
     */
    mutate(updater: (data: DataType | null) => DataType): void {
      const currentState = store.getState()[key] as AsyncState<DataType>
      const newData = updater(currentState?.data || null)

      store.setState({
        [key]: {
          data: newData,
          loading: false,
          error: null,
          timestamp: Date.now()
        }
      } as any, `ASYNC_${String(key)}_MUTATE`)
    }
  }
}

/**
 * Helper to create initial async state
 */
export function asyncState<T>(initialData: T | null = null): AsyncState<T> {
  return {
    data: initialData,
    loading: false,
    error: null,
    timestamp: null
  }
}
