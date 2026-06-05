import { createStore } from '../src/index'
import { 
  computed, 
  crossTabSync, 
  createOptimisticUpdates,
  createAsync,
  asyncState,
  createBatcher,
  createSnapshots,
  createHistoryBranching,
  subscribeToField
} from '../src/index'
import { 
  useStore, 
  useComputed, 
  useField, 
  useAsync,
  useOptimistic 
} from '../src/react'

// ============================================
// 1. COMPUTED/DERIVED STATE
// ============================================

interface CartState {
  items: Array<{ id: string; price: number; quantity: number }>
  taxRate: number
}

const cartStore = createStore<CartState>({
  items: [],
  taxRate: 0.1
})

// Create computed values
const subtotal = computed(cartStore, state => 
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

const tax = computed(cartStore, state => 
  subtotal.get() * state.taxRate
)

const total = computed(cartStore, state => 
  subtotal.get() + tax.get()
)

// Use in React
function Cart() {
  const totalValue = useComputed(cartStore, state => 
    state.items.reduce((sum, item) => sum + item.price * item.quantity, 0) * (1 + state.taxRate)
  )

  return <div>Total: ${totalValue.toFixed(2)}</div>
}

// ============================================
// 2. FIELD-LEVEL SUBSCRIPTIONS
// ============================================

interface UserState {
  profile: { name: string; email: string }
  settings: { theme: 'light' | 'dark' }
  notifications: number
}

const userStore = createStore<UserState>({
  profile: { name: 'Alice', email: 'alice@example.com' },
  settings: { theme: 'light' },
  notifications: 0
})

// Subscribe to specific field only
const unsubscribe = subscribeToField(
  userStore, 
  'notifications', 
  (newCount, oldCount) => {
    console.log(`Notifications: ${oldCount} → ${newCount}`)
  }
)

// Use in React - only re-renders when notifications change
function NotificationBadge() {
  const count = useField(userStore, 'notifications')
  return <span>{count}</span>
}

// ============================================
// 3. CROSS-TAB SYNCHRONIZATION
// ============================================

const settingsStore = createStore(
  { theme: 'light', language: 'en' },
  { persist: { key: 'settings', storage: localStorage } }
)

// Sync across tabs
const cleanup = crossTabSync(settingsStore, {
  key: 'settings-sync',
  syncDelay: 100
})

// Now when you change theme in one tab, all other tabs update automatically!

// ============================================
// 4. OPTIMISTIC UPDATES
// ============================================

interface TodoState {
  todos: Array<{ id: string; text: string; completed: boolean }>
}

const todoStore = createStore<TodoState>({
  todos: []
})

const optimistic = createOptimisticUpdates(todoStore)

// Optimistically add todo
async function addTodoOptimistic(text: string) {
  const tempId = crypto.randomUUID()
  
  await optimistic.optimistic(
    tempId,
    state => ({
      todos: [...state.todos, { id: tempId, text, completed: false }]
    }),
    async () => {
      // API call
      const response = await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify({ text })
      })
      
      if (!response.ok) throw new Error('Failed to add todo')
      
      const todo = await response.json()
      
      // Update with real ID
      todoStore.setState(state => ({
        todos: state.todos.map(t => t.id === tempId ? todo : t)
      }))
    }
  )
}

// Use in React
function TodoList() {
  const todos = useStore(todoStore).todos
  const { optimistic: optimisticUpdate } = useOptimistic(todoStore)

  const handleAddTodo = async (text: string) => {
    const tempId = crypto.randomUUID()
    
    try {
      await optimisticUpdate(
        tempId,
        state => ({
          todos: [...state.todos, { id: tempId, text, completed: false }]
        }),
        () => fetch('/api/todos', { method: 'POST', body: JSON.stringify({ text }) })
      )
    } catch (err) {
      // Automatically rolled back!
      console.error('Failed to add todo')
    }
  }

  return (
    <div>
      {todos.map(todo => <div key={todo.id}>{todo.text}</div>)}
    </div>
  )
}

// ============================================
// 5. ASYNC STATE MANAGEMENT
// ============================================

interface AppState {
  user: AsyncState<{ id: string; name: string }>
  posts: AsyncState<Array<{ id: string; title: string }>>
}

const appStore = createStore<AppState>({
  user: asyncState(),
  posts: asyncState()
})

const userAsync = createAsync(appStore, 'user')

// Fetch with automatic loading/error states
async function fetchUser() {
  await userAsync.execute(
    async () => {
      const response = await fetch('/api/user')
      return response.json()
    },
    {
      staleTime: 5000, // Cache for 5 seconds
      retry: 3,
      retryDelay: 1000
    }
  )
}

// Use in React
function UserProfile() {
  const { data, loading, error, refetch } = useAsync(
    appStore,
    'user',
    async () => {
      const response = await fetch('/api/user')
      return response.json()
    },
    { staleTime: 5000, retry: 3 }
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return null

  return <div>Welcome, {data.name}!</div>
}

// ============================================
// 6. BATCH UPDATES
// ============================================

const gameStore = createStore({
  score: 0,
  level: 1,
  health: 100
})

const batcher = createBatcher(gameStore)

// Batch multiple updates into one
function levelUp() {
  batcher.batch(() => {
    batcher.setState({ score: gameStore.getState().score + 100 })
    batcher.setState({ level: gameStore.getState().level + 1 })
    batcher.setState({ health: 100 })
  })
  // Only triggers ONE re-render instead of three!
}

// ============================================
// 7. STATE SNAPSHOTS
// ============================================

const editorStore = createStore({
  content: '',
  cursorPosition: 0
})

const snapshots = createSnapshots(editorStore)

// Create snapshot
snapshots.create('before-edit', 'Before user edit')

// Make changes
editorStore.setState({ content: 'New content' })

// Restore snapshot
snapshots.restore('before-edit')

// Compare snapshots
const diff = snapshots.diff('before-edit') // Compare with current
console.log(diff?.changed) // { content: { from: '', to: 'New content' } }

// Export/import snapshots
const exported = snapshots.export()
localStorage.setItem('editor-snapshots', exported)

// Later...
const imported = localStorage.getItem('editor-snapshots')
if (imported) snapshots.import(imported)

// ============================================
// 8. GIT-LIKE HISTORY BRANCHING
// ============================================

const documentStore = createStore({
  title: 'My Document',
  content: 'Initial content'
})

const history = createHistoryBranching(documentStore, { maxNodes: 50 })

// Make changes
documentStore.setState({ content: 'First edit' })
documentStore.setState({ content: 'Second edit' })

// Create experimental branch
history.createBranch('experiment')
documentStore.setState({ content: 'Experimental change' })

// Go back to main branch
history.checkout('main')
console.log(documentStore.getState().content) // 'Second edit'

// Switch back to experiment
history.checkout('experiment')
console.log(documentStore.getState().content) // 'Experimental change'

// Merge experiment into main
history.checkout('main')
history.merge('experiment')

// Navigate history
history.back()  // Go to parent commit
history.forward() // Go to child commit

// Visualize as tree
console.log(history.visualize())
/*
└─ ● INIT (10:30:45 AM)
   ├─ ○ UPDATE (10:30:46 AM)
   └─ ○ UPDATE (10:30:47 AM)
      └─ ● UPDATE (10:30:48 AM)
*/

// ============================================
// 9. COMBINING FEATURES
// ============================================

// Real-world example: E-commerce cart with all features

interface EcommerceState {
  cart: { items: Array<{ id: string; name: string; price: number; quantity: number }> }
  user: AsyncState<{ id: string; name: string; email: string }>
  checkout: { status: 'idle' | 'processing' | 'success' | 'error' }
}

const ecommerceStore = createStore<EcommerceState>(
  {
    cart: { items: [] },
    user: asyncState(),
    checkout: { status: 'idle' }
  },
  {
    devtools: true,
    name: 'E-commerce',
    persist: {
      key: 'ecommerce-cart',
      partialize: state => ({ cart: state.cart }) // Only persist cart
    }
  }
)

// Cross-tab sync for cart
crossTabSync(ecommerceStore, { key: 'cart-sync', filter: state => state.cart })

// Computed totals
const cartTotal = computed(ecommerceStore, state =>
  state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// Optimistic cart operations
const cartOptimistic = createOptimisticUpdates(ecommerceStore)

async function addToCartOptimistic(productId: string) {
  await cartOptimistic.optimistic(
    `add-${productId}`,
    state => ({
      cart: {
        items: [...state.cart.items, { id: productId, name: 'Loading...', price: 0, quantity: 1 }]
      }
    }),
    async () => {
      const response = await fetch(`/api/cart/add`, {
        method: 'POST',
        body: JSON.stringify({ productId })
      })
      
      if (!response.ok) throw new Error('Failed to add to cart')
      
      const updatedCart = await response.json()
      ecommerceStore.setState({ cart: updatedCart })
    }
  )
}

// Snapshots for undo
const cartSnapshots = createSnapshots(ecommerceStore)

function createCheckpoint() {
  cartSnapshots.create(`checkpoint-${Date.now()}`, 'Before checkout')
}

// React component using all features
function EcommerceApp() {
  const { data: user } = useAsync(
    ecommerceStore,
    'user',
    () => fetch('/api/user').then(r => r.json())
  )
  
  const cartItems = useField(ecommerceStore, 'cart').items
  const total = useComputed(ecommerceStore, state =>
    state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )
  
  const { optimistic } = useOptimistic(ecommerceStore)

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <div>Cart Total: ${total.toFixed(2)}</div>
      {cartItems.map(item => (
        <div key={item.id}>{item.name} - ${item.price}</div>
      ))}
    </div>
  )
}

export default EcommerceApp
