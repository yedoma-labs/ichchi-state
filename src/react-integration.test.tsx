import { describe, it, expect, vi } from 'vitest'
import React, { useState } from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders, userEvent } from './test-utils'
import { createStore } from './store'
import { useStore, useStoreSelector } from './react'

describe('React Integration - Real Components', () => {
  describe('useStore with real React', () => {
    it('should render store state in component', () => {
      const store = createStore({ count: 42, message: 'Hello' })

      function TestComponent() {
        const state = useStore(store)
        return (
          <div>
            <div data-testid="count">{state.count}</div>
            <div data-testid="message">{state.message}</div>
          </div>
        )
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('count')).toHaveTextContent('42')
      expect(screen.getByTestId('message')).toHaveTextContent('Hello')
    })

    it('should update component when store changes', async () => {
      const store = createStore({ count: 0 })

      function TestComponent() {
        const state = useStore(store)
        return (
          <div>
            <div data-testid="count">{state.count}</div>
            <button onClick={() => store.setState({ count: state.count + 1 })}>
              Increment
            </button>
          </div>
        )
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('count')).toHaveTextContent('0')

      const button = screen.getByRole('button')
      await userEvent.click(button)

      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('1')
      })
    })

    it('should work with selector', async () => {
      const store = createStore({ count: 5, name: 'test', other: 'data' })

      function TestComponent() {
        const doubled = useStoreSelector(store, (state) => state.count * 2)
        return <div data-testid="doubled">{doubled}</div>
      }

      renderWithProviders(<TestComponent />)

      expect(screen.getByTestId('doubled')).toHaveTextContent('10')

      store.setState({ count: 7 })

      await waitFor(() => {
        expect(screen.getByTestId('doubled')).toHaveTextContent('14')
      })
    })

    it('should not re-render when unselected state changes', async () => {
      const store = createStore({ count: 0, name: 'test' })
      let renderCount = 0

      function TestComponent() {
        renderCount++
        const count = useStoreSelector(store, (state) => state.count)
        return <div data-testid="count">{count}</div>
      }

      renderWithProviders(<TestComponent />)
      const initialRenders = renderCount

      // Change unrelated state
      store.setState({ name: 'changed' })

      // Wait a bit to ensure no re-render happens
      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(renderCount).toBe(initialRenders)

      // Now change selected state
      store.setState({ count: 1 })

      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('1')
      })

      expect(renderCount).toBeGreaterThan(initialRenders)
    })

    it('should handle multiple components subscribing to same store', async () => {
      const store = createStore({ count: 0 })

      function ComponentA() {
        const state = useStore(store)
        return <div data-testid="count-a">{state.count}</div>
      }

      function ComponentB() {
        const state = useStore(store)
        return <div data-testid="count-b">{state.count}</div>
      }

      function App() {
        return (
          <>
            <ComponentA />
            <ComponentB />
            <button onClick={() => store.setState({ count: 99 })}>Update</button>
          </>
        )
      }

      renderWithProviders(<App />)

      expect(screen.getByTestId('count-a')).toHaveTextContent('0')
      expect(screen.getByTestId('count-b')).toHaveTextContent('0')

      await userEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByTestId('count-a')).toHaveTextContent('99')
        expect(screen.getByTestId('count-b')).toHaveTextContent('99')
      })
    })

    it('should handle rapid state updates', async () => {
      const store = createStore({ count: 0 })

      function TestComponent() {
        const state = useStore(store)
        return <div data-testid="count">{state.count}</div>
      }

      renderWithProviders(<TestComponent />)

      // Rapid updates
      for (let i = 1; i <= 10; i++) {
        store.setState({ count: i })
      }

      await waitFor(() => {
        expect(screen.getByTestId('count')).toHaveTextContent('10')
      })
    })

    it('should cleanup subscriptions on unmount', async () => {
      const store = createStore({ count: 0 })
      const subscriber = vi.fn()
      store.subscribe(subscriber)

      function TestComponent() {
        const state = useStore(store)
        return <div data-testid="count">{state.count}</div>
      }

      function App() {
        const [show, setShow] = useState(true)
        return (
          <>
            {show && <TestComponent />}
            <button onClick={() => setShow(false)}>Unmount</button>
          </>
        )
      }

      renderWithProviders(<App />)

      const initialSubscribers = subscriber.mock.calls.length

      await userEvent.click(screen.getByRole('button'))

      // Update store after unmount
      subscriber.mockClear()
      store.setState({ count: 1 })

      // Should only notify the original subscriber, not the unmounted component
      expect(subscriber).toHaveBeenCalledTimes(1)
    })
  })

  describe('Store with actions pattern', () => {
    it('should work with actions pattern', async () => {
      const store = createStore({ count: 0 })
      
      const actions = {
        increment: () => store.setState((s) => ({ count: s.count + 1 })),
        decrement: () => store.setState((s) => ({ count: s.count - 1 })),
        reset: () => store.setState({ count: 0 }),
      }

      function Counter() {
        const state = useStore(store)
        return (
          <div>
            <div data-testid="count">{state.count}</div>
            <button onClick={actions.increment}>+</button>
            <button onClick={actions.decrement}>-</button>
            <button onClick={actions.reset}>Reset</button>
          </div>
        )
      }

      renderWithProviders(<Counter />)

      expect(screen.getByTestId('count')).toHaveTextContent('0')

      await userEvent.click(screen.getByText('+'))
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))

      await userEvent.click(screen.getByText('+'))
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))

      await userEvent.click(screen.getByText('-'))
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))

      await userEvent.click(screen.getByText('Reset'))
      await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'))
    })
  })

  describe('Complex state updates', () => {
    it('should handle nested object updates', async () => {
      const store = createStore({
        user: { name: 'Alice', age: 30, preferences: { theme: 'dark' } },
      })

      function UserProfile() {
        const state = useStore(store)
        return (
          <div>
            <div data-testid="name">{state.user.name}</div>
            <div data-testid="age">{state.user.age}</div>
            <div data-testid="theme">{state.user.preferences.theme}</div>
            <button
              onClick={() =>
                store.setState({
                  user: {
                    ...state.user,
                    name: 'Bob',
                    preferences: { ...state.user.preferences, theme: 'light' },
                  },
                })
              }
            >
              Update
            </button>
          </div>
        )
      }

      renderWithProviders(<UserProfile />)

      expect(screen.getByTestId('name')).toHaveTextContent('Alice')
      expect(screen.getByTestId('theme')).toHaveTextContent('dark')

      await userEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByTestId('name')).toHaveTextContent('Bob')
        expect(screen.getByTestId('theme')).toHaveTextContent('light')
      })
    })

    it('should handle array updates', async () => {
      const store = createStore({ items: ['A', 'B', 'C'] })

      function ItemList() {
        const state = useStore(store)
        return (
          <div>
            <ul data-testid="list">
              {state.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <button onClick={() => store.setState({ items: [...state.items, 'D'] })}>
              Add
            </button>
            <button onClick={() => store.setState({ items: state.items.slice(0, -1) })}>
              Remove
            </button>
          </div>
        )
      }

      renderWithProviders(<ItemList />)

      expect(screen.getByTestId('list').children).toHaveLength(3)

      await userEvent.click(screen.getByText('Add'))
      await waitFor(() => expect(screen.getByTestId('list').children).toHaveLength(4))

      await userEvent.click(screen.getByText('Remove'))
      await waitFor(() => expect(screen.getByTestId('list').children).toHaveLength(3))
    })
  })
})
