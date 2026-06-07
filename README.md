# @yedoma-labs/ichchi-state

[![CI](https://github.com/yedoma-labs/ichchi-state/actions/workflows/ci.yml/badge.svg)](https://github.com/yedoma-labs/ichchi-state/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@yedoma-labs/ichchi-state)](https://www.npmjs.com/package/@yedoma-labs/ichchi-state)
[![npm downloads](https://img.shields.io/npm/dm/@yedoma-labs/ichchi-state)](https://www.npmjs.com/package/@yedoma-labs/ichchi-state)
[![Node.js](https://img.shields.io/node/v/@yedoma-labs/ichchi-state)](https://www.npmjs.com/package/@yedoma-labs/ichchi-state)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x+-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![License](https://img.shields.io/npm/l/@yedoma-labs/ichchi-state)](LICENSE)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@yedoma-labs/ichchi-state)](https://bundlephobia.com/package/@yedoma-labs/ichchi-state)

Lightweight, TypeScript-first state manager with DevTools and time-travel debugging.

> **About the name:** *ichchi* (иччи) comes from the Yakutian (Sakha) language, meaning "guardian spirit" — protective spirits that watch over places, objects, and natural phenomena. Like the permafrost (yedoma) preserves ancient matter, ichchi guards and preserves the essential state of your application.

## Features

- 🪶 **< 3KB** gzipped
- 🔷 **TypeScript-native** with full type inference
- 🛠️ **Redux DevTools** integration
- ⏱️ **Time-travel debugging** with undo/redo
- 💾 **Persistence** to localStorage/sessionStorage
- 🔌 **Middleware** support (logger, thunk, debounce)
- ⚛️ **React bindings** with hooks
- 🌐 **Framework-agnostic** core

## Live Demo

```bash
# Builds and starts demo server
pnpm run demo

# Or for development (uses existing build)
pnpm run demo:dev
```

Open http://localhost:5173 in your browser (auto-redirects to demo).

The [interactive demo](./examples/demo) features:
- Multi-stage environment configuration with [@yedoma-labs/bylyt-env-guard](https://github.com/yedoma-labs/bylyt-env-guard)
- Counter with Redux DevTools integration
- Time-travel debugging with undo/redo
- Todo list with stage-specific persistence
- Async data loading with different API endpoints per stage
- **Uses local build** - tests latest security-hardened version

## Installation

```bash
# Using pnpm (recommended)
pnpm add @yedoma-labs/ichchi-state

# Using npm
npm install @yedoma-labs/ichchi-state

# Using yarn
yarn add @yedoma-labs/ichchi-state

# Using bun
bun add @yedoma-labs/ichchi-state
```

## Quick Start

### Basic Store

```typescript
import { createStore } from '@yedoma-labs/ichchi-state'

interface CounterState {
  count: number
  name: string
}

const store = createStore<CounterState>({
  count: 0,
  name: 'Counter'
})

// Get state
console.log(store.getState()) // { count: 0, name: 'Counter' }

// Update state
store.setState({ count: 1 })

// Update with function
store.setState(state => ({ count: state.count + 1 }))

// Subscribe to changes
const unsubscribe = store.subscribe((state, prevState) => {
  console.log('State changed:', state, prevState)
})
```

### With DevTools

```typescript
import { createStore } from '@yedoma-labs/ichchi-state'

const store = createStore(
  { count: 0 },
  { 
    devtools: true,
    name: 'Counter Store' 
  }
)

store.setState({ count: 1 }, 'INCREMENT')
// Opens in Redux DevTools with action name
```

### With Persistence

```typescript
import { createStore } from '@yedoma-labs/ichchi-state'

const store = createStore(
  { count: 0 },
  {
    persist: {
      key: 'my-counter',
      storage: localStorage, // or sessionStorage
      version: 1,
      // Only persist specific fields
      partialize: (state) => ({ count: state.count }),
    }
  }
)

// State automatically syncs with localStorage
```

### With Middleware

```typescript
import { createStore, applyMiddleware } from '@yedoma-labs/ichchi-state'
import { logger, timeTravel, debounce } from '@yedoma-labs/ichchi-state/middleware'

const store = createStore({ count: 0 })

const enhancedStore = applyMiddleware(
  store,
  logger({ collapsed: false, diff: true }),
  timeTravel({ limit: 50 })
)

enhancedStore.setState({ count: 1 })
enhancedStore.setState({ count: 2 })

// Time travel
enhancedStore.undo() // count: 1
enhancedStore.redo() // count: 2
```

## React Integration

### With Hooks

```typescript
import { createStore } from '@yedoma-labs/ichchi-state'
import { useStore, useStoreSelector } from '@yedoma-labs/ichchi-state/react'

const store = createStore({ count: 0, name: 'Alice' })

function Counter() {
  // Use entire state (re-renders on any change)
  const state = useStore(store)
  
  return <div>{state.count}</div>
}

function OptimizedCounter() {
  // Use selector (only re-renders when count changes)
  const count = useStoreSelector(store, state => state.count)
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => store.setState(s => ({ count: s.count + 1 }))}>
        Increment
      </button>
    </div>
  )
}
```

### With Context Provider

```typescript
import { createStore } from '@yedoma-labs/ichchi-state'
import { createStoreContext } from '@yedoma-labs/ichchi-state/react'

const store = createStore({ count: 0 })
const { Provider, useStore, useSelector } = createStoreContext(store)

function App() {
  return (
    <Provider>
      <Counter />
    </Provider>
  )
}

function Counter() {
  const count = useSelector(state => state.count)
  const state = useStore()
  
  return <div>{count}</div>
}
```

## Middleware

### Logger

Logs all state changes to console with diff visualization.

```typescript
import { logger } from '@yedoma-labs/ichchi-state/middleware'

const enhancedStore = applyMiddleware(
  store,
  logger({ 
    collapsed: true,  // Collapse console groups
    diff: true        // Show state diff
  })
)
```

### Time Travel

Enables undo/redo functionality.

```typescript
import { timeTravel } from '@yedoma-labs/ichchi-state/middleware'

const enhancedStore = applyMiddleware(
  store,
  timeTravel({ limit: 50 }) // Keep last 50 states
) as any

enhancedStore.setState({ count: 1 })
enhancedStore.setState({ count: 2 })

enhancedStore.undo()           // Go back
enhancedStore.redo()           // Go forward
enhancedStore.canUndo()        // true/false
enhancedStore.canRedo()        // true/false
```

### Debounce

Debounces state updates.

```typescript
import { debounce } from '@yedoma-labs/ichchi-state/middleware'

const enhancedStore = applyMiddleware(
  store,
  debounce(300) // Wait 300ms before applying state
)
```

### Custom Middleware

```typescript
import type { Middleware } from '@yedoma-labs/ichchi-state'

const myMiddleware: Middleware<MyState> = (store) => (next) => (partial, actionName) => {
  console.log('Before:', store.getState())
  next(partial, actionName)
  console.log('After:', store.getState())
}

const enhancedStore = applyMiddleware(store, myMiddleware)
```

## Advanced Examples

### Todo App

```typescript
import { createStore, applyMiddleware } from '@yedoma-labs/ichchi-state'
import { logger, timeTravel } from '@yedoma-labs/ichchi-state/middleware'

interface Todo {
  id: string
  text: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  filter: 'all' | 'active' | 'completed'
}

const store = createStore<TodoState>(
  { todos: [], filter: 'all' },
  {
    devtools: true,
    name: 'Todo Store',
    persist: {
      key: 'todos-v1',
      version: 1,
    }
  }
)

const enhancedStore = applyMiddleware(
  store,
  logger(),
  timeTravel()
)

// Actions
const addTodo = (text: string) => {
  enhancedStore.setState(
    state => ({
      todos: [...state.todos, { id: crypto.randomUUID(), text, completed: false }]
    }),
    'ADD_TODO'
  )
}

const toggleTodo = (id: string) => {
  enhancedStore.setState(
    state => ({
      todos: state.todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }),
    'TOGGLE_TODO'
  )
}

const setFilter = (filter: TodoState['filter']) => {
  enhancedStore.setState({ filter }, 'SET_FILTER')
}
```

### Async Actions with Thunk

```typescript
import { thunk } from '@yedoma-labs/ichchi-state/middleware'

interface UserState {
  user: { id: string; name: string } | null
  loading: boolean
  error: string | null
}

const store = createStore<UserState>({
  user: null,
  loading: false,
  error: null
})

const enhancedStore = applyMiddleware(store, thunk())

// Async action
const fetchUser = async (id: string) => {
  enhancedStore.setState({ loading: true, error: null }, 'FETCH_USER_START')
  
  try {
    const response = await fetch(`/api/users/${id}`)
    const user = await response.json()
    enhancedStore.setState({ user, loading: false }, 'FETCH_USER_SUCCESS')
  } catch (error) {
    enhancedStore.setState(
      { error: error.message, loading: false },
      'FETCH_USER_ERROR'
    )
  }
}
```

## API Reference

### `createStore<T>(initialState, config?)`

Creates a new store.

**Parameters:**
- `initialState`: Initial state object
- `config?`: Optional configuration
  - `devtools?: boolean` - Enable Redux DevTools
  - `name?: string` - Store name for DevTools
  - `persist?: PersistConfig` - Persistence configuration

**Returns:** `Store<T>`

### `Store<T>`

**Methods:**
- `getState()` - Returns current state
- `setState(partial, actionName?)` - Updates state
- `subscribe(listener)` - Subscribes to state changes
- `destroy()` - Cleanup and remove listeners

### `applyMiddleware(store, ...middlewares)`

Enhances store with middleware.

**Parameters:**
- `store`: Store instance
- `middlewares`: One or more middleware functions

**Returns:** Enhanced store

## Bundle Size

| Package | Size (gzip) |
|---------|------------|
| Core (`@yedoma-labs/ichchi-state`) | ~1.5 KB |
| React bindings (`@yedoma-labs/ichchi-state/react`) | ~0.8 KB |
| Middleware (`@yedoma-labs/ichchi-state/middleware`) | ~1.2 KB |
| **Total** | **~3.5 KB** |

## Comparison

| Feature | @yedoma-labs/ichchi-state | [Zustand](https://github.com/pmndrs/zustand) | [Redux](https://redux.js.org/) | [Jotai](https://jotai.org/) |
|---------|--------------|---------|-------|-------|
| Bundle size | 3.5 KB | 3.2 KB | 23 KB | 3 KB |
| TypeScript | ✅ Native | ✅ Good | ⚠️ Complex | ✅ Good |
| DevTools | ✅ Built-in | ⚠️ Manual | ✅ Built-in | ⚠️ Manual |
| Time Travel | ✅ Middleware | ❌ No | ✅ Yes | ❌ No |
| Persistence | ✅ Built-in | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| Learning curve | Easy | Easy | Hard | Medium |

## Development

This project uses [pnpm](https://pnpm.io) as the package manager.

### Setup

```bash
# Install pnpm (if not already installed)
npm install -g pnpm
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Install dependencies
pnpm install
```

### Development Commands

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Type check
pnpm run typecheck

# Build
pnpm run build

# Run demo
pnpm run demo

# Run specific test file
pnpm test src/store.test.ts

# Run E2E tests (requires build first)
pnpm run build
pnpm run e2e

# Install Playwright browsers (first time only)
pnpm run e2e:install
```

**Note:** E2E tests are skipped in CI (too flaky). Always run manually before releases:
```bash
pnpm run build && pnpm run e2e
```

See [Release Process](.github/RELEASE.md) for details.

### CI/CD

GitHub Actions uses:
- **pnpm** for package management (faster, disk-efficient)
- **Node.js** latest (currently 22, auto-updates to 24+)
- **Vitest** for unit/integration tests (258 tests)
- **Playwright** for E2E tests (manual only - not in CI)

**Workflows:**
- `ci.yml` - Runs on every push/PR: typecheck, unit tests, build
- `release.yml` - Runs on version tags (v*.*.*): tests, build, npm publish

**Note:** E2E tests are too flaky for CI and must be run manually before releases.

### Why pnpm?

- ⚡ **Fast**: ~2x faster than npm, disk-space efficient
- 🔒 **Strict**: Prevents phantom dependencies
- 📦 **Compatible**: 100% npm-compatible, drop-in replacement
- 🏢 **Proven**: Used by Microsoft, TikTok, and other major projects

### Security

- All 16 known vulnerabilities (3 Critical, 7 High) have been fixed in v0.1.0
- 94.73% test coverage with 258 passing tests
- Comprehensive security test suite included
- Security warnings only appear in development (`NODE_ENV !== 'production'`)
- Production builds are silent by default
- See internal security reports for details (not in repository)

## License

MIT
