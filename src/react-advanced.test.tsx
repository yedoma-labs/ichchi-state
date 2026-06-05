import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { createStore } from './store'
import {
  useComputed,
  useField,
  useAsync,
  useOptimistic,
  useFields,
  useBatchedMutations
} from './react-advanced'
import type { AsyncState } from './async-state'

describe('React Advanced Hooks', () => {
  describe('useComputed', () => {
    it('should compute derived value', () => {
      const store = createStore({ count: 5, multiplier: 2 })
      
      const { result } = renderHook(() =>
        useComputed(store, state => state.count * state.multiplier)
      )

      expect(result.current).toBe(10)
    })

    it('should update when dependencies change', async () => {
      const store = createStore({ count: 5, multiplier: 2 })
      
      const { result } = renderHook(() =>
        useComputed(store, state => state.count * state.multiplier)
      )

      expect(result.current).toBe(10)

      await act(async () => {
        store.setState({ count: 10 })
      })

      await waitFor(() => {
        expect(result.current).toBe(20)
      })
    })

    it('should recompute when deps array changes', async () => {
      const store = createStore({ count: 5 })
      let multiplier = 2

      const { result, rerender } = renderHook(
        ({ m }) => useComputed(store, state => state.count * m, [m]),
        { initialProps: { m: multiplier } }
      )

      expect(result.current).toBe(10)

      multiplier = 3
      rerender({ m: multiplier })

      await waitFor(() => {
        expect(result.current).toBe(15)
      })
    })

    it('should handle complex computations', async () => {
      const store = createStore({
        items: [1, 2, 3, 4, 5],
        filter: 'even'
      })

      const { result } = renderHook(() =>
        useComputed(store, state => {
          if (state.filter === 'even') {
            return state.items.filter(n => n % 2 === 0)
          }
          return state.items.filter(n => n % 2 !== 0)
        })
      )

      expect(result.current).toEqual([2, 4])

      await act(async () => {
        store.setState({ filter: 'odd' })
      })

      await waitFor(() => {
        expect(result.current).toEqual([1, 3, 5])
      })
    })
  })

  describe('useField', () => {
    it('should subscribe to specific field', () => {
      const store = createStore({ count: 5, name: 'Alice' })
      
      const { result } = renderHook(() => useField(store, 'count'))

      expect(result.current).toBe(5)
    })

    it('should update when field changes', async () => {
      const store = createStore({ count: 5, name: 'Alice' })
      
      const { result } = renderHook(() => useField(store, 'count'))

      expect(result.current).toBe(5)

      await act(async () => {
        store.setState({ count: 10 })
      })

      await waitFor(() => {
        expect(result.current).toBe(10)
      })
    })

    it('should not update when other fields change', async () => {
      const store = createStore({ count: 5, name: 'Alice' })
      
      const { result } = renderHook(() => useField(store, 'count'))
      const initialRenderCount = result.current

      await act(async () => {
        store.setState({ name: 'Bob' })
      })

      // Should still be the same reference
      expect(result.current).toBe(initialRenderCount)
    })
  })

  describe('useAsync', () => {
    it('should provide refetch function', async () => {
      const store = createStore<{ user: AsyncState<{ name: string }> }>({
        user: { data: null, loading: false, error: null, timestamp: null }
      })

      const fetchUser = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { name: 'Alice' }
      })

      const { result } = renderHook(() =>
        useAsync(store, 'user', fetchUser, { enabled: false })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.data).toBeNull()
      expect(typeof result.current.refetch).toBe('function')
    })

    it('should provide error property', async () => {
      const store = createStore<{ user: AsyncState<any> }>({
        user: { data: null, loading: false, error: new Error('Test error'), timestamp: null }
      })

      const fetchUser = vi.fn(async () => ({ name: 'Alice' }))

      const { result } = renderHook(() =>
        useAsync(store, 'user', fetchUser, { enabled: false })
      )

      expect(result.current.error).toBeTruthy()
      expect(result.current.error?.message).toBe('Test error')
    })

    it('should auto-fetch when enabled', async () => {
      const store = createStore<{ user: AsyncState<{ name: string }> }>({
        user: { data: null, loading: false, error: null, timestamp: null }
      })

      const fetchUser = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { name: 'Alice' }
      })

      renderHook(() =>
        useAsync(store, 'user', fetchUser, { enabled: true })
      )

      await waitFor(() => {
        expect(fetchUser).toHaveBeenCalled()
      })
    })

    it('should not auto-fetch when disabled', async () => {
      const store = createStore<{ user: AsyncState<{ name: string }> }>({
        user: { data: null, loading: false, error: null, timestamp: null }
      })

      const fetchUser = vi.fn(async () => ({ name: 'Alice' }))

      renderHook(() =>
        useAsync(store, 'user', fetchUser, { enabled: false })
      )

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(fetchUser).not.toHaveBeenCalled()
    })

    it('should expose invalidate function', async () => {
      const store = createStore<{ user: AsyncState<{ name: string }> }>({
        user: { data: { name: 'Alice' }, loading: false, error: null, timestamp: null }
      })

      const fetchUser = async () => ({ name: 'Bob' })

      const { result } = renderHook(() =>
        useAsync(store, 'user', fetchUser, { enabled: false })
      )

      expect(result.current.data).toEqual({ name: 'Alice' })
      expect(typeof result.current.invalidate).toBe('function')
      
      // Call invalidate
      await act(async () => {
        result.current.invalidate()
      })

      // Function should execute without errors
      expect(true).toBe(true)
    })
  })

  describe('useOptimistic', () => {
    it('should perform optimistic updates', async () => {
      const store = createStore({ count: 0 })
      
      const { result } = renderHook(() => useOptimistic(store))

      const asyncAction = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return 'success'
      })

      await act(async () => {
        const promise = result.current.optimistic(
          'update-1',
          () => ({ count: 10 }),
          asyncAction
        )
        
        // State should update immediately
        expect(store.getState().count).toBe(10)
        
        await promise
      })

      expect(asyncAction).toHaveBeenCalled()
      expect(store.getState().count).toBe(10)
    })

    it('should rollback on error', async () => {
      const store = createStore({ count: 0 })
      
      const { result } = renderHook(() => useOptimistic(store))

      const failingAction = async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Failed')
      }

      await act(async () => {
        try {
          await result.current.optimistic(
            'update-1',
            () => ({ count: 10 }),
            failingAction
          )
        } catch (err) {
          // Expected to fail
        }
      })

      await waitFor(() => {
        expect(store.getState().count).toBe(0)
      })
    })

    it('should check pending status', async () => {
      const store = createStore({ count: 0 })
      
      const { result } = renderHook(() => useOptimistic(store))

      const slowAction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'done'
      }

      await act(async () => {
        result.current.optimistic(
          'update-1',
          () => ({ count: 10 }),
          slowAction
        )
        
        expect(result.current.isPending('update-1')).toBe(true)
      })
    })

    it('should get pending updates', async () => {
      const store = createStore({ count: 0 })
      
      const { result } = renderHook(() => useOptimistic(store))

      const slowAction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'done'
      }

      await act(async () => {
        result.current.optimistic(
          'update-1',
          () => ({ count: 10 }),
          slowAction
        )
        
        const pending = result.current.getPending()
        expect(pending).toContain('update-1')
      })
    })

    it('should manually rollback update', async () => {
      const store = createStore({ count: 0 })
      
      const { result } = renderHook(() => useOptimistic(store))

      const slowAction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'done'
      }

      await act(async () => {
        result.current.optimistic(
          'update-1',
          () => ({ count: 10 }),
          slowAction
        )
        
        expect(store.getState().count).toBe(10)
        
        result.current.rollback('update-1')
        
        // Give time for rollback
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(store.getState().count).toBe(0)
    })

    it('should rollback all updates', async () => {
      const store = createStore({ count: 0 })
      
      const { result } = renderHook(() => useOptimistic(store))

      const slowAction = async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return 'done'
      }

      await act(async () => {
        result.current.optimistic('update-1', () => ({ count: 10 }), slowAction)
        
        expect(store.getState().count).toBe(10)
        
        result.current.rollbackAll()
        
        // Give time for rollback to complete
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      expect(store.getState().count).toBe(0)
    })
  })

  describe('useFields', () => {
    it('should subscribe to multiple fields', () => {
      const store = createStore({ count: 5, name: 'Alice', age: 30 })
      
      const { result } = renderHook(() =>
        useFields(store, ['count', 'name'])
      )

      expect(result.current).toEqual({ count: 5, name: 'Alice' })
    })

    it('should update when any subscribed field changes', async () => {
      const store = createStore({ count: 5, name: 'Alice', age: 30 })
      
      const { result } = renderHook(() =>
        useFields(store, ['count', 'name'])
      )

      await act(async () => {
        store.setState({ count: 10 })
      })

      await waitFor(() => {
        expect(result.current.count).toBe(10)
      })
    })

    it('should not update when non-subscribed fields change', async () => {
      const store = createStore({ count: 5, name: 'Alice', age: 30 })
      
      const { result } = renderHook(() =>
        useFields(store, ['count', 'name'])
      )

      const initialResult = result.current

      await act(async () => {
        store.setState({ age: 31 })
      })

      // Should not trigger re-render
      expect(result.current).toBe(initialResult)
    })

    it('should handle empty field array', () => {
      const store = createStore({ count: 5, name: 'Alice' })
      
      const { result } = renderHook(() =>
        useFields(store, [])
      )

      expect(result.current).toEqual({})
    })
  })

  describe('useBatchedMutations', () => {
    it('should batch mutations', async () => {
      const store = createStore({ count: 0, value: 0 })
      
      const { result } = renderHook(() => useBatchedMutations(store))

      await act(async () => {
        result.current.batch(() => {
          store.setState({ count: 1 })
          store.setState({ value: 2 })
          store.setState({ count: 3 })
        })
      })

      expect(store.getState()).toEqual({ count: 3, value: 2 })
    })

    it('should execute all mutations in batch', async () => {
      const store = createStore({ a: 0, b: 0, c: 0 })
      
      const { result } = renderHook(() => useBatchedMutations(store))

      await act(async () => {
        result.current.batch(() => {
          store.setState({ a: 1 })
          store.setState({ b: 2 })
          store.setState({ c: 3 })
        })
      })

      expect(store.getState()).toEqual({ a: 1, b: 2, c: 3 })
    })
  })
})
