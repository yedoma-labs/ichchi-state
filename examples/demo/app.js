// Environment configuration using bylyt-env-guard
import { createEnv, eg } from 'https://esm.sh/@yedoma-labs/bylyt-env-guard@latest'

// Ichchi State imports (using local build via import map)
import { createStore, applyMiddleware } from '@yedoma-labs/ichchi-state'
import { logger, timeTravel } from '@yedoma-labs/ichchi-state/middleware'

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

// Define environment schema with two stages
const env = createEnv({
  schema: {
    STAGE: eg.enum(['development', 'production']).default('development'),
    API_URL: eg.url(),
    DEBUG: eg.boolean().default(false),
    DEVTOOLS_ENABLED: eg.boolean().default(false),
    PERSIST_STORAGE: eg.enum(['localStorage', 'sessionStorage']).default('localStorage'),
    LOG_LEVEL: eg.enum(['debug', 'info', 'warn', 'error']).default('info'),
    TIME_TRAVEL_LIMIT: eg.integer().min(10).max(200).default(50),
  },
  profiles: {
    development: {
      STAGE: 'development',
      API_URL: 'http://localhost:3000',
      DEBUG: 'true',
      DEVTOOLS_ENABLED: 'true',
      PERSIST_STORAGE: 'localStorage',
      LOG_LEVEL: 'debug',
      TIME_TRAVEL_LIMIT: '50',
    },
    production: {
      STAGE: 'production',
      API_URL: 'https://api.production.example.com',
      DEBUG: 'false',
      DEVTOOLS_ENABLED: 'false',
      PERSIST_STORAGE: 'sessionStorage',
      LOG_LEVEL: 'error',
      TIME_TRAVEL_LIMIT: '20',
    },
  },
  activeProfile: 'development', // Start in development
})

// ============================================================================
// STORE SETUP
// ============================================================================

// Counter store with DevTools
const counterStore = createStore(
  { count: 0 },
  {
    devtools: env.DEVTOOLS_ENABLED,
    name: 'Counter Store',
  }
)

// Time travel store
const timeTravelStore = createStore({ value: 0 })
const middlewares = [
  env.DEBUG ? logger({ collapsed: false, diff: true }) : null,
  timeTravel({ limit: env.TIME_TRAVEL_LIMIT })
].filter(Boolean)
const ttEnhanced = applyMiddleware(timeTravelStore, ...middlewares)

// Todo store with persistence
const todoStore = createStore(
  { todos: [] },
  {
    devtools: env.DEVTOOLS_ENABLED,
    name: 'Todo Store',
    persist: {
      key: `todos-${env.STAGE}`,
      storage: window[env.PERSIST_STORAGE],
      version: 1,
    },
  }
)

// Async store
const asyncStore = createStore({
  status: 'idle',
  data: null,
  error: null,
})

// ============================================================================
// UI HELPERS
// ============================================================================

function updateEnvDisplay() {
  document.querySelector('[data-env="stage"]').textContent = env.STAGE
  document.querySelector('[data-env="apiUrl"]').textContent = env.API_URL
  document.querySelector('[data-env="debug"]').textContent = env.DEBUG
  document.querySelector('[data-env="devtools"]').textContent = env.DEVTOOLS_ENABLED
  document.querySelector('[data-env="persistStorage"]').textContent = env.PERSIST_STORAGE
  document.querySelector('[data-env="logLevel"]').textContent = env.LOG_LEVEL
}

function log(level, ...args) {
  const levels = ['debug', 'info', 'warn', 'error']
  const currentLevelIndex = levels.indexOf(env.LOG_LEVEL)
  const msgLevelIndex = levels.indexOf(level)

  if (msgLevelIndex >= currentLevelIndex) {
    console[level](`[${env.STAGE}]`, ...args)
  }
}

// ============================================================================
// STAGE SWITCHING
// ============================================================================

let currentEnv = env

document.querySelectorAll('.stage-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const stage = btn.dataset.stage

    // Update active button
    document.querySelectorAll('.stage-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')

    // Recreate environment with new profile
    currentEnv = createEnv({
      schema: {
        STAGE: eg.enum(['development', 'production']).default('development'),
        API_URL: eg.url(),
        DEBUG: eg.boolean().default(false),
        DEVTOOLS_ENABLED: eg.boolean().default(false),
        PERSIST_STORAGE: eg.enum(['localStorage', 'sessionStorage']).default('localStorage'),
        LOG_LEVEL: eg.enum(['debug', 'info', 'warn', 'error']).default('info'),
        TIME_TRAVEL_LIMIT: eg.integer().min(10).max(200).default(50),
      },
      profiles: {
        development: {
          STAGE: 'development',
          API_URL: 'http://localhost:3000',
          DEBUG: 'true',
          DEVTOOLS_ENABLED: 'true',
          PERSIST_STORAGE: 'localStorage',
          LOG_LEVEL: 'debug',
          TIME_TRAVEL_LIMIT: '50',
        },
        production: {
          STAGE: 'production',
          API_URL: 'https://api.production.example.com',
          DEBUG: 'false',
          DEVTOOLS_ENABLED: 'false',
          PERSIST_STORAGE: 'sessionStorage',
          LOG_LEVEL: 'error',
          TIME_TRAVEL_LIMIT: '20',
        },
      },
      activeProfile: stage,
    })

    updateEnvDisplay()
    log('info', 'Switched to', stage, 'stage')

    // Show DevTools status
    updateDevToolsStatus()
  })
})

// ============================================================================
// COUNTER FEATURE
// ============================================================================

const counterDisplay = document.querySelector('[data-counter="display"]')

counterStore.subscribe(state => {
  counterDisplay.textContent = state.count
})

document.querySelector('[data-counter="increment"]').onclick = () => {
  counterStore.setState(
    state => ({ count: state.count + 1 }),
    'INCREMENT'
  )
  log('debug', 'Counter incremented')
}

document.querySelector('[data-counter="decrement"]').onclick = () => {
  counterStore.setState(
    state => ({ count: state.count - 1 }),
    'DECREMENT'
  )
  log('debug', 'Counter decremented')
}

document.querySelector('[data-counter="reset"]').onclick = () => {
  counterStore.setState({ count: 0 }, 'RESET')
  log('info', 'Counter reset')
}

function updateDevToolsStatus() {
  const statusEl = document.getElementById('devtools-status')
  if (currentEnv.DEVTOOLS_ENABLED) {
    statusEl.innerHTML = '<div class="devtools-badge">Redux DevTools Active</div>'
  } else {
    statusEl.innerHTML = ''
  }
}

updateDevToolsStatus()

// ============================================================================
// TIME TRAVEL FEATURE
// ============================================================================

const ttDisplay = document.querySelector('[data-timetravel="display"]')
const ttHistory = document.querySelector('[data-timetravel="history"]')
const undoBtn = document.querySelector('[data-timetravel="undo"]')
const redoBtn = document.querySelector('[data-timetravel="redo"]')

function updateTimeTravelUI() {
  const state = ttEnhanced.getState()
  ttDisplay.textContent = state.value

  undoBtn.disabled = !ttEnhanced.canUndo()
  redoBtn.disabled = !ttEnhanced.canRedo()

  // Update history display
  if (ttEnhanced.getHistory) {
    const history = ttEnhanced.getHistory()
    ttHistory.innerHTML = history
      .slice(-5)
      .reverse()
      .map((h, i) => `
        <div class="history-item">
          <strong>${i === 0 ? 'Current' : `${i} steps ago`}:</strong> 
          value = ${h.value}
        </div>
      `)
      .join('')
  }
}

ttEnhanced.subscribe(() => updateTimeTravelUI())
updateTimeTravelUI()

document.querySelector('[data-timetravel="add"]').onclick = () => {
  ttEnhanced.setState(s => ({ value: s.value + 1 }), 'ADD_1')
  log('debug', 'Time travel: added 1')
}

document.querySelector('[data-timetravel="add5"]').onclick = () => {
  ttEnhanced.setState(s => ({ value: s.value + 5 }), 'ADD_5')
  log('debug', 'Time travel: added 5')
}

undoBtn.onclick = () => {
  ttEnhanced.undo()
  log('debug', 'Time travel: undo')
}

redoBtn.onclick = () => {
  ttEnhanced.redo()
  log('debug', 'Time travel: redo')
}

// ============================================================================
// TODO FEATURE
// ============================================================================

const todoInput = document.querySelector('[data-todo="input"]')
const todoList = document.querySelector('[data-todo="list"]')
const todoCount = document.querySelector('[data-todo="count"]')

function renderTodos() {
  const { todos } = todoStore.getState()

  todoList.innerHTML = todos
    .map(
      (todo, i) => `
      <div class="todo-item ${todo.completed ? 'completed' : ''}">
        <div class="todo-text" data-todo-toggle="${i}">
          ${todo.text}
        </div>
        <button class="delete-btn" data-todo-delete="${i}">Delete</button>
      </div>
    `
    )
    .join('')

  todoCount.textContent = todos.length

  // Add event listeners
  todos.forEach((_, i) => {
    const toggleEl = document.querySelector(`[data-todo-toggle="${i}"]`)
    const deleteEl = document.querySelector(`[data-todo-delete="${i}"]`)

    if (toggleEl) {
      toggleEl.onclick = () => {
        todoStore.setState(
          state => ({
            todos: state.todos.map((t, idx) =>
              idx === i ? { ...t, completed: !t.completed } : t
            ),
          }),
          'TOGGLE_TODO'
        )
        log('debug', 'Todo toggled:', i)
      }
    }

    if (deleteEl) {
      deleteEl.onclick = () => {
        todoStore.setState(
          state => ({
            todos: state.todos.filter((_, idx) => idx !== i),
          }),
          'DELETE_TODO'
        )
        log('info', 'Todo deleted:', i)
      }
    }
  })
}

todoStore.subscribe(renderTodos)
renderTodos()

document.querySelector('[data-todo="add"]').onclick = () => {
  if (todoInput.value.trim()) {
    todoStore.setState(
      state => ({
        todos: [
          ...state.todos,
          {
            id: Date.now(),
            text: todoInput.value.trim(),
            completed: false,
          },
        ],
      }),
      'ADD_TODO'
    )
    log('info', 'Todo added:', todoInput.value.trim())
    todoInput.value = ''
  }
}

todoInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') {
    document.querySelector('[data-todo="add"]').click()
  }
})

document.querySelector('[data-todo="clear-completed"]').onclick = () => {
  todoStore.setState(
    state => ({
      todos: state.todos.filter(t => !t.completed),
    }),
    'CLEAR_COMPLETED'
  )
  log('info', 'Cleared completed todos')
}

// ============================================================================
// ASYNC FEATURE
// ============================================================================

const statusBadge = document.querySelector('[data-async="status"]')
const dataDisplay = document.querySelector('[data-async="data"]')

asyncStore.subscribe(state => {
  // Update status badge
  statusBadge.textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1)
  statusBadge.className = `status-badge status-${state.status}`

  // Update data display
  if (state.status === 'loading') {
    dataDisplay.textContent = 'Loading...'
    dataDisplay.classList.add('loading')
  } else {
    dataDisplay.classList.remove('loading')

    if (state.error) {
      dataDisplay.textContent = `Error: ${state.error}`
      dataDisplay.style.color = '#dc2626'
    } else if (state.data) {
      dataDisplay.textContent = JSON.stringify(state.data, null, 2)
      dataDisplay.style.color = '#065f46'
    } else {
      dataDisplay.textContent = 'No data loaded'
      dataDisplay.style.color = '#6b7280'
    }
  }
})

document.querySelector('[data-async="fetch-success"]').onclick = async () => {
  asyncStore.setState({ status: 'loading', error: null }, 'FETCH_START')
  log('info', 'Fetching data from:', currentEnv.API_URL)

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))

  asyncStore.setState(
    {
      status: 'success',
      data: {
        stage: currentEnv.STAGE,
        apiUrl: currentEnv.API_URL,
        timestamp: new Date().toISOString(),
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      },
    },
    'FETCH_SUCCESS'
  )
  log('info', 'Data fetched successfully')
}

document.querySelector('[data-async="fetch-error"]').onclick = async () => {
  asyncStore.setState({ status: 'loading', error: null }, 'FETCH_START')
  log('warn', 'Fetching data (will fail)...')

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500))

  asyncStore.setState(
    {
      status: 'error',
      error: 'Failed to connect to API server',
      data: null,
    },
    'FETCH_ERROR'
  )
  log('error', 'Failed to fetch data')
}

// ============================================================================
// INITIALIZATION
// ============================================================================

log('info', 'Application initialized')
log('debug', 'Environment:', currentEnv)

updateEnvDisplay()

// Show helpful console message
if (currentEnv.DEVTOOLS_ENABLED) {
  console.log(
    '%c🪶 Ichchi State Demo',
    'font-size: 24px; font-weight: bold; color: #667eea;'
  )
  console.log(
    '%cRedux DevTools is enabled! Open the extension to see state changes in real-time.',
    'font-size: 14px; color: #10b981;'
  )
  console.log(
    '%cTry switching between Development and Production stages to see environment changes.',
    'font-size: 12px; color: #6b7280;'
  )
}
