export type Listener<T> = (state: T, prevState: T) => void
export type Selector<T, R> = (state: T) => R
export type Unsubscribe = () => void

export interface StoreConfig<T> {
  devtools?: boolean
  name?: string
  persist?: PersistConfig<T>
  maxListeners?: number // SECURITY: Limit listeners to prevent DoS
}

export interface PersistConfig<T> {
  key: string
  storage?: Storage
  version?: number
  migrate?: (persistedState: unknown, version: number) => T
  partialize?: (state: T) => Partial<T>
}

export interface Middleware<T> {
  (store: Store<T>): (next: SetStateFn<T>) => SetStateFn<T>
}

export type SetStateFn<T> = (
  partial: Partial<T> | ((state: T) => Partial<T>),
  actionName?: string
) => void

export interface Store<T> {
  getState: () => T
  setState: SetStateFn<T>
  subscribe: (listener: Listener<T>) => Unsubscribe
  destroy: () => void
}

export interface DevToolsConnection {
  init: (state: unknown) => void
  send: (action: { type: string }, state: unknown) => void
  subscribe: (listener: (message: any) => void) => Unsubscribe
}
