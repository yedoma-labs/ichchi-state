import { describe, it, expect, vi } from 'vitest'
import { createStore } from './store'
import { subscribeToField, subscribeToFields } from './field-subscriptions'

describe('Field Subscriptions', () => {
  describe('subscribeToField', () => {
    it('should subscribe to a top-level field', () => {
      const store = createStore({ count: 0, name: 'Alice' })
      const listener = vi.fn()

      subscribeToField(store, 'count', listener)

      store.setState({ count: 1 })

      expect(listener).toHaveBeenCalledWith(1, 0)
    })

    it('should not trigger when other fields change', () => {
      const store = createStore({ count: 0, name: 'Alice' })
      const listener = vi.fn()

      subscribeToField(store, 'count', listener)

      store.setState({ name: 'Bob' })

      expect(listener).not.toHaveBeenCalled()
    })

    it('should subscribe to nested field with dot notation', () => {
      const store = createStore({
        user: {
          profile: {
            name: 'Alice'
          }
        }
      })
      const listener = vi.fn()

      subscribeToField(store, 'user.profile.name' as any, listener)

      store.setState({
        user: {
          profile: {
            name: 'Bob'
          }
        }
      })

      expect(listener).toHaveBeenCalledWith('Bob', 'Alice')
    })

    it('should handle deeply nested paths', () => {
      const store = createStore({
        a: {
          b: {
            c: {
              d: 'deep'
            }
          }
        }
      })
      const listener = vi.fn()

      subscribeToField(store, 'a.b.c.d' as any, listener)

      store.setState({
        a: {
          b: {
            c: {
              d: 'deeper'
            }
          }
        }
      })

      expect(listener).toHaveBeenCalledWith('deeper', 'deep')
    })

    it('should handle undefined values in path', () => {
      const store = createStore<any>({
        user: undefined
      })
      const listener = vi.fn()

      subscribeToField(store, 'user.name' as any, listener)

      store.setState({
        user: {
          name: 'Alice'
        }
      })

      expect(listener).toHaveBeenCalledWith('Alice', undefined)
    })

    it('should handle null values in path', () => {
      const store = createStore<any>({
        user: null
      })
      const listener = vi.fn()

      subscribeToField(store, 'user.name' as any, listener)

      store.setState({
        user: {
          name: 'Alice'
        }
      })

      expect(listener).toHaveBeenCalledWith('Alice', undefined)
    })

    it('should use custom equality function', () => {
      const store = createStore({ items: [1, 2, 3] })
      const listener = vi.fn()

      // Custom equality that considers arrays with same values as equal
      const arrayEquals = (a: any[], b: any[]) => {
        if (!Array.isArray(a) || !Array.isArray(b)) return false
        return a.length === b.length && a.every((v, i) => v === b[i])
      }

      subscribeToField(store, 'items', listener, arrayEquals)

      // Same values, different array instance
      store.setState({ items: [1, 2, 3] })

      // Should not trigger because values are equal
      expect(listener).not.toHaveBeenCalled()

      // Different values
      store.setState({ items: [1, 2, 3, 4] })

      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()

      const unsubscribe = subscribeToField(store, 'count', listener)

      store.setState({ count: 1 })
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      store.setState({ count: 2 })
      expect(listener).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should handle multiple subscriptions to same field', () => {
      const store = createStore({ count: 0 })
      const listener1 = vi.fn()
      const listener2 = vi.fn()

      subscribeToField(store, 'count', listener1)
      subscribeToField(store, 'count', listener2)

      store.setState({ count: 1 })

      expect(listener1).toHaveBeenCalledWith(1, 0)
      expect(listener2).toHaveBeenCalledWith(1, 0)
    })

    it('should track current value correctly across updates', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()

      subscribeToField(store, 'count', listener)

      store.setState({ count: 1 })
      store.setState({ count: 2 })
      store.setState({ count: 3 })

      expect(listener).toHaveBeenCalledTimes(3)
      expect(listener).toHaveBeenNthCalledWith(1, 1, 0)
      expect(listener).toHaveBeenNthCalledWith(2, 2, 1)
      expect(listener).toHaveBeenNthCalledWith(3, 3, 2)
    })

    it('should handle object field changes', () => {
      const store = createStore({ user: { name: 'Alice', age: 30 } })
      const listener = vi.fn()

      subscribeToField(store, 'user', listener)

      const newUser = { name: 'Bob', age: 25 }
      store.setState({ user: newUser })

      expect(listener).toHaveBeenCalledWith(
        newUser,
        { name: 'Alice', age: 30 }
      )
    })

    it('should handle array field changes', () => {
      const store = createStore({ items: [1, 2, 3] })
      const listener = vi.fn()

      subscribeToField(store, 'items', listener)

      const newItems = [4, 5, 6]
      store.setState({ items: newItems })

      expect(listener).toHaveBeenCalledWith(newItems, [1, 2, 3])
    })
  })

  describe('subscribeToFields', () => {
    it('should subscribe to multiple fields', () => {
      const store = createStore({ count: 0, name: 'Alice', age: 30 })
      const listener = vi.fn()

      subscribeToFields(store, ['count', 'name'], listener)

      store.setState({ count: 1 })

      expect(listener).toHaveBeenCalledTimes(1)
      const changes = listener.mock.calls[0][0]
      expect(changes.size).toBe(1)
      expect(changes.get('count')).toEqual({ current: 1, previous: 0 })
    })

    it('should only report changed fields', () => {
      const store = createStore({ count: 0, name: 'Alice', age: 30 })
      const listener = vi.fn()

      subscribeToFields(store, ['count', 'name', 'age'], listener)

      store.setState({ count: 1, name: 'Bob' })

      const changes = listener.mock.calls[0][0]
      expect(changes.size).toBe(2)
      expect(changes.has('count')).toBe(true)
      expect(changes.has('name')).toBe(true)
      expect(changes.has('age')).toBe(false)
    })

    it('should not trigger when no watched fields change', () => {
      const store = createStore({ count: 0, name: 'Alice', age: 30 })
      const listener = vi.fn()

      subscribeToFields(store, ['count', 'name'], listener)

      store.setState({ age: 31 })

      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle nested field paths', () => {
      const store = createStore({
        user: {
          profile: {
            name: 'Alice',
            email: 'alice@example.com'
          }
        }
      })
      const listener = vi.fn()

      subscribeToFields(store, ['user.profile.name' as any, 'user.profile.email' as any], listener)

      store.setState({
        user: {
          profile: {
            name: 'Bob',
            email: 'alice@example.com'
          }
        }
      })

      const changes = listener.mock.calls[0][0]
      expect(changes.size).toBe(1)
      expect(changes.get('user.profile.name')).toEqual({
        current: 'Bob',
        previous: 'Alice'
      })
    })

    it('should handle multiple simultaneous changes', () => {
      const store = createStore({ a: 1, b: 2, c: 3, d: 4 })
      const listener = vi.fn()

      subscribeToFields(store, ['a', 'b', 'c'], listener)

      store.setState({ a: 10, b: 20, c: 30 })

      const changes = listener.mock.calls[0][0]
      expect(changes.size).toBe(3)
      expect(changes.get('a')).toEqual({ current: 10, previous: 1 })
      expect(changes.get('b')).toEqual({ current: 20, previous: 2 })
      expect(changes.get('c')).toEqual({ current: 30, previous: 3 })
    })

    it('should return unsubscribe function', () => {
      const store = createStore({ count: 0, name: 'Alice' })
      const listener = vi.fn()

      const unsubscribe = subscribeToFields(store, ['count', 'name'], listener)

      store.setState({ count: 1 })
      expect(listener).toHaveBeenCalledTimes(1)

      unsubscribe()

      store.setState({ count: 2 })
      expect(listener).toHaveBeenCalledTimes(1) // Still 1
    })

    it('should handle empty paths array', () => {
      const store = createStore({ count: 0 })
      const listener = vi.fn()

      subscribeToFields(store, [], listener)

      store.setState({ count: 1 })

      expect(listener).not.toHaveBeenCalled()
    })

    it('should provide Map with correct structure', () => {
      const store = createStore({ x: 10, y: 20 })
      const listener = vi.fn()

      subscribeToFields(store, ['x', 'y'], listener)

      store.setState({ x: 100, y: 200 })

      const changes = listener.mock.calls[0][0]
      expect(changes instanceof Map).toBe(true)
      expect(Array.from(changes.keys())).toEqual(['x', 'y'])
      expect(changes.get('x')).toEqual({ current: 100, previous: 10 })
      expect(changes.get('y')).toEqual({ current: 200, previous: 20 })
    })

    it('should handle undefined and null in nested paths', () => {
      const store = createStore<any>({
        data: undefined
      })
      const listener = vi.fn()

      subscribeToFields(store, ['data.value' as any], listener)

      store.setState({
        data: {
          value: 42
        }
      })

      const changes = listener.mock.calls[0][0]
      expect(changes.get('data.value')).toEqual({
        current: 42,
        previous: undefined
      })
    })
  })
})
