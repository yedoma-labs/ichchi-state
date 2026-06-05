import { createStore, applyMiddleware } from '../src'
import { logger, timeTravel } from '../src/middleware'

// Define state type
interface CounterState {
  count: number
  step: number
}

// Create store
const store = createStore<CounterState>(
  { count: 0, step: 1 },
  { 
    devtools: true,
    name: 'Counter'
  }
)

// Apply middleware
const enhancedStore = applyMiddleware(
  store,
  logger({ collapsed: false }),
  timeTravel({ limit: 10 })
) as any

// Subscribe to changes
enhancedStore.subscribe((state: CounterState, prevState: CounterState) => {
  console.log('Count changed:', prevState.count, '->', state.count)
})

// Actions
const increment = () => {
  enhancedStore.setState(
    (state: CounterState) => ({ count: state.count + state.step }),
    'INCREMENT'
  )
}

const decrement = () => {
  enhancedStore.setState(
    (state: CounterState) => ({ count: state.count - state.step }),
    'DECREMENT'
  )
}

const setStep = (step: number) => {
  enhancedStore.setState({ step }, 'SET_STEP')
}

const reset = () => {
  enhancedStore.setState({ count: 0 }, 'RESET')
}

// Test
console.log('Initial:', enhancedStore.getState())

increment() // 1
increment() // 2
increment() // 3
setStep(5)
increment() // 8

console.log('Current:', enhancedStore.getState())

enhancedStore.undo()
console.log('After undo:', enhancedStore.getState())

enhancedStore.redo()
console.log('After redo:', enhancedStore.getState())
