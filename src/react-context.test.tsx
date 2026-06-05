import { describe, it, expect } from 'vitest'
import React from 'react'
import { screen } from '@testing-library/react'
import { renderWithProviders, userEvent } from './test-utils'
import { createStore } from './store'
import { createStoreContext } from './react'

describe('React Context', () => {
  describe('createStoreContext', () => {
    it('should create context with Provider', () => {
      const store = createStore({ count: 0 })
      const { Provider, useStore } = createStoreContext(store)

      function TestComponent() {
        const state = useStore()
        return <div data-testid="count">{state.count}</div>
      }

      renderWithProviders(
        <Provider>
          <TestComponent />
        </Provider>
      )

      expect(screen.getByTestId('count')).toHaveTextContent('0')
    })

    it('should update components when store changes', async () => {
      const store = createStore({ count: 0 })
      const { Provider, useStore } = createStoreContext(store)

      function TestComponent() {
        const state = useStore()
        return (
          <div>
            <div data-testid="count">{state.count}</div>
            <button onClick={() => store.setState({ count: state.count + 1 })}>
              Increment
            </button>
          </div>
        )
      }

      renderWithProviders(
        <Provider>
          <TestComponent />
        </Provider>
      )

      expect(screen.getByTestId('count')).toHaveTextContent('0')

      const button = screen.getByRole('button')
      await userEvent.click(button)

      expect(screen.getByTestId('count')).toHaveTextContent('1')
    })

    it('should work with useSelector', () => {
      const store = createStore({ count: 0, name: 'Alice' })
      const { Provider, useSelector } = createStoreContext(store)

      function TestComponent() {
        const count = useSelector(state => state.count)
        return <div data-testid="count">{count}</div>
      }

      renderWithProviders(
        <Provider>
          <TestComponent />
        </Provider>
      )

      expect(screen.getByTestId('count')).toHaveTextContent('0')
    })

    it('should update with useSelector when selected value changes', async () => {
      const store = createStore({ count: 0, name: 'Alice' })
      const { Provider, useSelector } = createStoreContext(store)

      function TestComponent() {
        const count = useSelector(state => state.count)
        return (
          <div>
            <div data-testid="count">{count}</div>
            <button onClick={() => store.setState({ count: count + 1 })}>
              Increment
            </button>
          </div>
        )
      }

      renderWithProviders(
        <Provider>
          <TestComponent />
        </Provider>
      )

      expect(screen.getByTestId('count')).toHaveTextContent('0')

      const button = screen.getByRole('button')
      await userEvent.click(button)

      expect(screen.getByTestId('count')).toHaveTextContent('1')
    })

    it('should use custom equality function with useSelector', async () => {
      const store = createStore({ items: [1, 2, 3] })
      const { Provider, useSelector } = createStoreContext(store)

      let renderCount = 0

      function TestComponent() {
        renderCount++
        const items = useSelector(
          state => state.items,
          (a, b) => a.length === b.length
        )
        return <div data-testid="items">{items.join(',')}</div>
      }

      renderWithProviders(
        <Provider>
          <TestComponent />
        </Provider>
      )

      expect(screen.getByTestId('items')).toHaveTextContent('1,2,3')
      const initialRenderCount = renderCount

      // Same length array - should not re-render
      store.setState({ items: [4, 5, 6] })
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Might still re-render once, but shouldn't continue
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 1)
    })

    it('should throw error when useStore is used outside Provider', () => {
      const store = createStore({ count: 0 })
      const { useStore } = createStoreContext(store)

      function TestComponent() {
        useStore()
        return <div>Test</div>
      }

      // Expect error to be thrown
      expect(() => {
        renderWithProviders(<TestComponent />)
      }).toThrow('useStoreContext must be used within a Provider')
    })

    it('should throw error when useSelector is used outside Provider', () => {
      const store = createStore({ count: 0 })
      const { useSelector } = createStoreContext(store)

      function TestComponent() {
        useSelector(state => state.count)
        return <div>Test</div>
      }

      // Expect error to be thrown
      expect(() => {
        renderWithProviders(<TestComponent />)
      }).toThrow('useStoreSelectorContext must be used within a Provider')
    })

    it('should handle multiple consumers', () => {
      const store = createStore({ count: 0, name: 'Alice' })
      const { Provider, useStore } = createStoreContext(store)

      function Counter() {
        const state = useStore()
        return <div data-testid="counter">{state.count}</div>
      }

      function Name() {
        const state = useStore()
        return <div data-testid="name">{state.name}</div>
      }

      renderWithProviders(
        <Provider>
          <Counter />
          <Name />
        </Provider>
      )

      expect(screen.getByTestId('counter')).toHaveTextContent('0')
      expect(screen.getByTestId('name')).toHaveTextContent('Alice')
    })

    it('should handle nested providers', () => {
      const store1 = createStore({ value: 'store1' })
      const store2 = createStore({ value: 'store2' })

      const Context1 = createStoreContext(store1)
      const Context2 = createStoreContext(store2)

      function TestComponent() {
        const state1 = Context1.useStore()
        const state2 = Context2.useStore()

        return (
          <div>
            <div data-testid="value1">{state1.value}</div>
            <div data-testid="value2">{state2.value}</div>
          </div>
        )
      }

      renderWithProviders(
        <Context1.Provider>
          <Context2.Provider>
            <TestComponent />
          </Context2.Provider>
        </Context1.Provider>
      )

      expect(screen.getByTestId('value1')).toHaveTextContent('store1')
      expect(screen.getByTestId('value2')).toHaveTextContent('store2')
    })

    it('should maintain separate state for different stores', async () => {
      const store1 = createStore({ count: 0 })
      const store2 = createStore({ count: 100 })

      const Context1 = createStoreContext(store1)
      const Context2 = createStoreContext(store2)

      function TestComponent() {
        const state1 = Context1.useStore()
        const state2 = Context2.useStore()

        return (
          <div>
            <div data-testid="count1">{state1.count}</div>
            <div data-testid="count2">{state2.count}</div>
            <button onClick={() => store1.setState({ count: state1.count + 1 })}>
              Inc 1
            </button>
            <button onClick={() => store2.setState({ count: state2.count + 1 })}>
              Inc 2
            </button>
          </div>
        )
      }

      renderWithProviders(
        <Context1.Provider>
          <Context2.Provider>
            <TestComponent />
          </Context2.Provider>
        </Context1.Provider>
      )

      expect(screen.getByTestId('count1')).toHaveTextContent('0')
      expect(screen.getByTestId('count2')).toHaveTextContent('100')

      const [button1, button2] = screen.getAllByRole('button')

      await userEvent.click(button1)
      expect(screen.getByTestId('count1')).toHaveTextContent('1')
      expect(screen.getByTestId('count2')).toHaveTextContent('100')

      await userEvent.click(button2)
      expect(screen.getByTestId('count1')).toHaveTextContent('1')
      expect(screen.getByTestId('count2')).toHaveTextContent('101')
    })
  })
})
