import type { Store } from './types'
import { validatePath } from './security'

type PathValue<T, P> = P extends keyof T
  ? T[P]
  : P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PathValue<T[K], R>
    : never
  : never

type Path<T> = keyof T | (string & {})

/**
 * Subscribe to a specific field in the state
 * Only triggers when that field changes
 */
export function subscribeToField<T extends object, P extends Path<T>>(
  store: Store<T>,
  path: P,
  listener: (value: PathValue<T, P>, prevValue: PathValue<T, P>) => void,
  equals: (a: any, b: any) => boolean = Object.is
): () => void {
  const getValueAtPath = (obj: any, p: string): any => {
    // SECURITY: Validate path to prevent prototype pollution (CWE-22)
    validatePath(p)
    return p.split('.').reduce((acc, key) => {
      // SECURITY: Double-check during traversal
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`[Security] Dangerous key in path: ${key}`)
      }
      return acc?.[key]
    }, obj)
  }

  let currentValue = getValueAtPath(store.getState(), path as string)

  return store.subscribe((state, prevState) => {
    const nextValue = getValueAtPath(state, path as string)
    const prevValue = getValueAtPath(prevState, path as string)

    if (!equals(currentValue, nextValue)) {
      currentValue = nextValue
      listener(nextValue, prevValue)
    }
  })
}

/**
 * Subscribe to multiple fields at once
 */
export function subscribeToFields<T extends object>(
  store: Store<T>,
  paths: Array<Path<T>>,
  listener: (changes: Map<string, { current: any; previous: any }>) => void
): () => void {
  const getValueAtPath = (obj: any, p: string): any => {
    // SECURITY: Validate path to prevent prototype pollution (CWE-22)
    validatePath(p)
    return p.split('.').reduce((acc, key) => {
      // SECURITY: Double-check during traversal
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new Error(`[Security] Dangerous key in path: ${key}`)
      }
      return acc?.[key]
    }, obj)
  }

  return store.subscribe((state, prevState) => {
    const changes = new Map<string, { current: any; previous: any }>()

    paths.forEach(path => {
      const current = getValueAtPath(state, path as string)
      const previous = getValueAtPath(prevState, path as string)

      if (!Object.is(current, previous)) {
        changes.set(path as string, { current, previous })
      }
    })

    if (changes.size > 0) {
      listener(changes)
    }
  })
}
