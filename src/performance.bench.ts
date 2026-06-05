import { bench, describe } from 'vitest'
import { createStore, applyMiddleware } from './store'
import { logger, debounce, timeTravel } from './middleware'
import { computed } from './computed'
import { createBatcher } from './batch-updates'
import { createSnapshots } from './snapshots'

describe('Store Performance', () => {
  bench('create store', () => {
    createStore({ count: 0, name: 'test', items: [] })
  })

  bench('get state (1000 times)', () => {
    const store = createStore({ count: 0 })
    for (let i = 0; i < 1000; i++) {
      store.getState()
    }
  })

  bench('set state (1000 times)', () => {
    const store = createStore({ count: 0 })
    for (let i = 0; i < 1000; i++) {
      store.setState({ count: i })
    }
  })

  bench('set state with function (1000 times)', () => {
    const store = createStore({ count: 0 })
    for (let i = 0; i < 1000; i++) {
      store.setState((state) => ({ count: state.count + 1 }))
    }
  })

  bench('subscribe/unsubscribe (1000 times)', () => {
    const store = createStore({ count: 0 })
    for (let i = 0; i < 1000; i++) {
      const unsubscribe = store.subscribe(() => {})
      unsubscribe()
    }
  })

  bench('100 subscribers, 100 updates', () => {
    const store = createStore({ count: 0 })
    const listeners = []
    
    for (let i = 0; i < 100; i++) {
      listeners.push(store.subscribe(() => {}))
    }
    
    for (let i = 0; i < 100; i++) {
      store.setState({ count: i })
    }
    
    listeners.forEach(unsub => unsub())
  })
})

describe('Middleware Performance', () => {
  bench('store without middleware (1000 updates)', () => {
    const store = createStore({ count: 0 })
    for (let i = 0; i < 1000; i++) {
      store.setState({ count: i })
    }
  })

  bench('store with logger middleware (1000 updates)', () => {
    const store = createStore({ count: 0 })
    const enhanced = applyMiddleware(store, logger({ collapsed: true }))
    for (let i = 0; i < 1000; i++) {
      enhanced.setState({ count: i })
    }
  })

  bench('store with timeTravel middleware (1000 updates)', () => {
    const store = createStore({ count: 0 })
    const enhanced = applyMiddleware(store, timeTravel({ limit: 50 }))
    for (let i = 0; i < 1000; i++) {
      enhanced.setState({ count: i })
    }
  })

  bench('store with multiple middleware (1000 updates)', () => {
    const store = createStore({ count: 0 })
    const enhanced = applyMiddleware(
      store,
      logger({ collapsed: true }),
      debounce(0),
      timeTravel({ limit: 50 })
    )
    for (let i = 0; i < 1000; i++) {
      enhanced.setState({ count: i })
    }
  })
})

describe('Computed Values Performance', () => {
  bench('computed value creation (1000 times)', () => {
    const store = createStore({ count: 0 })
    for (let i = 0; i < 1000; i++) {
      computed(store, (state) => state.count * 2)
    }
  })

  bench('computed value access (1000 times)', () => {
    const store = createStore({ count: 0 })
    const doubled = computed(store, (state) => state.count * 2)
    for (let i = 0; i < 1000; i++) {
      doubled.get()
    }
  })

  bench('computed value with state changes (1000 updates)', () => {
    const store = createStore({ count: 0 })
    const doubled = computed(store, (state) => state.count * 2)
    for (let i = 0; i < 1000; i++) {
      store.setState({ count: i })
      doubled.get()
    }
  })
})

describe('Batch Updates Performance', () => {
  bench('normal updates (1000 times)', () => {
    const store = createStore({ a: 0, b: 0, c: 0 })
    for (let i = 0; i < 1000; i++) {
      store.setState({ a: i })
      store.setState({ b: i })
      store.setState({ c: i })
    }
  })

  bench('batched updates (1000 batches)', () => {
    const store = createStore({ a: 0, b: 0, c: 0 })
    const batcher = createBatcher(store)
    for (let i = 0; i < 1000; i++) {
      batcher.batch(() => {
        batcher.setState({ a: i })
        batcher.setState({ b: i })
        batcher.setState({ c: i })
      })
    }
  })
})

describe('Snapshots Performance', () => {
  bench('create 100 snapshots', () => {
    const store = createStore({ count: 0, data: { nested: { value: 'test' } } })
    const snapshots = createSnapshots(store)
    for (let i = 0; i < 100; i++) {
      store.setState({ count: i })
      snapshots.create(`snapshot-${i}`)
    }
  })

  bench('restore snapshots (100 times)', () => {
    const store = createStore({ count: 0 })
    const snapshots = createSnapshots(store)
    
    for (let i = 0; i < 100; i++) {
      store.setState({ count: i })
      snapshots.create(`snapshot-${i}`)
    }
    
    for (let i = 0; i < 100; i++) {
      snapshots.restore(`snapshot-${i}`)
    }
  })

  bench('snapshot diff (100 times)', () => {
    const store = createStore({ 
      count: 0, 
      data: { a: 1, b: 2, c: 3 },
      items: [1, 2, 3, 4, 5] 
    })
    const snapshots = createSnapshots(store)
    
    snapshots.create('base')
    
    for (let i = 0; i < 100; i++) {
      store.setState({ 
        count: i,
        data: { a: i, b: i * 2, c: i * 3 }
      })
      snapshots.diff('base')
    }
  })
})

describe('Large State Performance', () => {
  bench('update large object (1000 props)', () => {
    const initialState: Record<string, number> = {}
    for (let i = 0; i < 1000; i++) {
      initialState[`prop${i}`] = i
    }
    
    const store = createStore(initialState)
    
    for (let i = 0; i < 100; i++) {
      store.setState({ [`prop${i}`]: i * 2 })
    }
  })

  bench('update large array (10000 items)', () => {
    const store = createStore({ items: Array.from({ length: 10000 }, (_, i) => i) })
    
    for (let i = 0; i < 100; i++) {
      const state = store.getState()
      store.setState({ items: [...state.items, 10000 + i] })
    }
  })

  bench('deeply nested updates', () => {
    const store = createStore({
      level1: {
        level2: {
          level3: {
            level4: {
              level5: {
                value: 0
              }
            }
          }
        }
      }
    })
    
    for (let i = 0; i < 100; i++) {
      const state = store.getState()
      store.setState({
        level1: {
          ...state.level1,
          level2: {
            ...state.level1.level2,
            level3: {
              ...state.level1.level2.level3,
              level4: {
                ...state.level1.level2.level3.level4,
                level5: {
                  value: i
                }
              }
            }
          }
        }
      })
    }
  })
})

describe('Realistic Application Patterns', () => {
  bench('todo app simulation (100 operations)', () => {
    interface Todo {
      id: number
      text: string
      completed: boolean
    }

    const store = createStore<{ todos: Todo[] }>({ todos: [] })

    // Add 50 todos
    for (let i = 0; i < 50; i++) {
      const state = store.getState()
      store.setState({
        todos: [...state.todos, { id: i, text: `Todo ${i}`, completed: false }]
      })
    }

    // Toggle 25 todos
    for (let i = 0; i < 25; i++) {
      const state = store.getState()
      store.setState({
        todos: state.todos.map(todo =>
          todo.id === i ? { ...todo, completed: !todo.completed } : todo
        )
      })
    }

    // Delete 25 todos
    for (let i = 0; i < 25; i++) {
      const state = store.getState()
      store.setState({
        todos: state.todos.filter(todo => todo.id !== i)
      })
    }
  })

  bench('user profile updates', () => {
    interface UserProfile {
      id: string
      name: string
      email: string
      preferences: {
        theme: string
        notifications: boolean
        language: string
      }
      friends: string[]
      posts: Array<{ id: number; content: string; likes: number }>
    }

    const store = createStore<UserProfile>({
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        theme: 'dark',
        notifications: true,
        language: 'en'
      },
      friends: [],
      posts: []
    })

    for (let i = 0; i < 100; i++) {
      const state = store.getState()
      
      // Update various parts
      if (i % 10 === 0) {
        store.setState({ name: `User ${i}` })
      }
      
      if (i % 5 === 0) {
        store.setState({
          preferences: {
            ...state.preferences,
            theme: i % 2 === 0 ? 'dark' : 'light'
          }
        })
      }
      
      if (i % 3 === 0) {
        store.setState({
          friends: [...state.friends, `friend-${i}`]
        })
      }
      
      if (i % 2 === 0) {
        store.setState({
          posts: [...state.posts, { id: i, content: `Post ${i}`, likes: 0 }]
        })
      }
    }
  })
})
