import React from 'react'
import { createStore, applyMiddleware } from '../src'
import { useStoreSelector } from '../src/react'
import { logger, timeTravel } from '../src/middleware'

// Types
interface Todo {
  id: string
  text: string
  completed: boolean
}

interface TodoState {
  todos: Todo[]
  filter: 'all' | 'active' | 'completed'
}

// Create store
const store = createStore<TodoState>(
  { todos: [], filter: 'all' },
  {
    devtools: true,
    name: 'Todo App',
    persist: {
      key: 'todos-v1',
      version: 1,
    }
  }
)

// Apply middleware
const enhancedStore = applyMiddleware(
  store,
  logger(),
  timeTravel()
) as any

// Actions
const actions = {
  addTodo: (text: string) => {
    enhancedStore.setState(
      (state: TodoState) => ({
        todos: [
          ...state.todos,
          { id: crypto.randomUUID(), text, completed: false }
        ]
      }),
      'ADD_TODO'
    )
  },

  toggleTodo: (id: string) => {
    enhancedStore.setState(
      (state: TodoState) => ({
        todos: state.todos.map(todo =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      }),
      'TOGGLE_TODO'
    )
  },

  deleteTodo: (id: string) => {
    enhancedStore.setState(
      (state: TodoState) => ({
        todos: state.todos.filter(todo => todo.id !== id)
      }),
      'DELETE_TODO'
    )
  },

  setFilter: (filter: TodoState['filter']) => {
    enhancedStore.setState({ filter }, 'SET_FILTER')
  },

  clearCompleted: () => {
    enhancedStore.setState(
      (state: TodoState) => ({
        todos: state.todos.filter(todo => !todo.completed)
      }),
      'CLEAR_COMPLETED'
    )
  }
}

// Selectors
const selectFilteredTodos = (state: TodoState) => {
  switch (state.filter) {
    case 'active':
      return state.todos.filter(t => !t.completed)
    case 'completed':
      return state.todos.filter(t => t.completed)
    default:
      return state.todos
  }
}

const selectStats = (state: TodoState) => ({
  total: state.todos.length,
  active: state.todos.filter(t => !t.completed).length,
  completed: state.todos.filter(t => t.completed).length,
})

// Components
function TodoApp() {
  const [input, setInput] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      actions.addTodo(input)
      setInput('')
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Todo App</h1>
      
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="What needs to be done?"
          style={{ width: '100%', padding: 10, fontSize: 16 }}
        />
      </form>

      <TodoFilters />
      <TodoList />
      <TodoStats />
      <TimeTravel />
    </div>
  )
}

function TodoFilters() {
  const filter = useStoreSelector(store, state => state.filter)

  return (
    <div style={{ margin: '20px 0' }}>
      {(['all', 'active', 'completed'] as const).map(f => (
        <button
          key={f}
          onClick={() => actions.setFilter(f)}
          style={{
            margin: '0 5px',
            padding: '5px 10px',
            fontWeight: filter === f ? 'bold' : 'normal'
          }}
        >
          {f}
        </button>
      ))}
    </div>
  )
}

function TodoList() {
  const todos = useStoreSelector(store, selectFilteredTodos)

  if (todos.length === 0) {
    return <p>No todos</p>
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {todos.map(todo => (
        <li key={todo.id} style={{ padding: '10px 0', borderBottom: '1px solid #eee' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => actions.toggleTodo(todo.id)}
            />
            <span style={{ 
              flex: 1,
              textDecoration: todo.completed ? 'line-through' : 'none',
              color: todo.completed ? '#999' : '#000'
            }}>
              {todo.text}
            </span>
            <button onClick={() => actions.deleteTodo(todo.id)}>Delete</button>
          </label>
        </li>
      ))}
    </ul>
  )
}

function TodoStats() {
  const stats = useStoreSelector(store, selectStats)

  return (
    <div style={{ marginTop: 20, padding: 10, background: '#f5f5f5' }}>
      <strong>Stats:</strong> {stats.total} total, {stats.active} active, {stats.completed} completed
      {stats.completed > 0 && (
        <button onClick={actions.clearCompleted} style={{ marginLeft: 10 }}>
          Clear Completed
        </button>
      )}
    </div>
  )
}

function TimeTravel() {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)

  return (
    <div style={{ marginTop: 20 }}>
      <button
        onClick={() => { enhancedStore.undo(); forceUpdate() }}
        disabled={!enhancedStore.canUndo()}
      >
        Undo
      </button>
      <button
        onClick={() => { enhancedStore.redo(); forceUpdate() }}
        disabled={!enhancedStore.canRedo()}
        style={{ marginLeft: 10 }}
      >
        Redo
      </button>
    </div>
  )
}

export default TodoApp
