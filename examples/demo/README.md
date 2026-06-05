# Ichchi State Demo - Multi-Stage Application

A comprehensive demonstration of `@yedoma-labs/ichchi-state` with multi-stage environment configuration using `@yedoma-labs/bylyt-env-guard`.

## Features Demonstrated

### 🌍 Environment Management
- **Two Stages**: Development and Production
- **Environment-specific Configuration**: Different settings per stage
- **Runtime Stage Switching**: See how configuration affects behavior
- Uses `@yedoma-labs/bylyt-env-guard` for type-safe environment validation

### 🪶 State Management
1. **Counter with DevTools**
   - Basic state management
   - Redux DevTools integration (development only)
   - Named actions for debugging

2. **Time Travel**
   - Undo/redo functionality
   - History visualization
   - Configurable history limit per stage

3. **Todo List with Persistence**
   - Add, toggle, and delete todos
   - Automatic persistence to localStorage/sessionStorage
   - Stage-specific storage keys
   - Clear completed items

4. **Async Data Loading**
   - Loading states
   - Success/error handling
   - Environment-aware API URLs
   - Simulated network delays

## Environment Configuration

### Development Stage
```javascript
{
  STAGE: 'development',
  API_URL: 'http://localhost:3000',
  DEBUG: true,
  DEVTOOLS_ENABLED: true,
  PERSIST_STORAGE: 'localStorage',
  LOG_LEVEL: 'debug',
  TIME_TRAVEL_LIMIT: 50
}
```

### Production Stage
```javascript
{
  STAGE: 'production',
  API_URL: 'https://api.production.example.com',
  DEBUG: false,
  DEVTOOLS_ENABLED: false,
  PERSIST_STORAGE: 'sessionStorage',
  LOG_LEVEL: 'error',
  TIME_TRAVEL_LIMIT: 20
}
```

## How to Run

### Option 1: Local Server
```bash
# From the examples/demo directory
npx serve . -l 5173
```

Then open http://localhost:5173 in your browser.

### Option 2: Simple HTTP Server
```bash
# Python 3
python3 -m http.server 5173

# Python 2
python -m SimpleHTTPServer 5173
```

### Option 3: Node.js http-server
```bash
npx http-server -p 5173
```

## Usage

1. **Open the demo** in your browser
2. **Open Redux DevTools** extension (if in development stage)
3. **Open Browser Console** to see logs (varies by stage)
4. **Try the features**:
   - Click counter buttons
   - Add todos and watch them persist
   - Use time travel undo/redo
   - Fetch data to see async handling
5. **Switch stages** using the Development/Production buttons
6. **Observe the changes**:
   - DevTools badge appears/disappears
   - Log verbosity changes
   - Storage location changes
   - Time travel history limit changes

## Key Concepts

### Environment Schema
```javascript
import { createEnv, eg } from '@yedoma-labs/bylyt-env-guard'

const env = createEnv({
  schema: {
    STAGE: eg.enum(['development', 'production']).default('development'),
    API_URL: eg.url(),
    DEBUG: eg.boolean().default(false),
    // ... more fields
  },
  profiles: {
    development: { /* dev defaults */ },
    production: { /* prod defaults */ }
  },
  activeProfile: 'development'
})
```

### Store Creation
```javascript
import { createStore } from '@yedoma-labs/ichchi-state'

const store = createStore(
  { count: 0 },
  {
    devtools: env.DEVTOOLS_ENABLED,
    name: 'Counter Store',
    persist: {
      key: `counter-${env.STAGE}`,
      storage: window[env.PERSIST_STORAGE]
    }
  }
)
```

### Middleware
```javascript
import { applyMiddleware } from '@yedoma-labs/ichchi-state'
import { logger, timeTravel } from '@yedoma-labs/ichchi-state/middleware'

const enhanced = applyMiddleware(
  store,
  env.DEBUG ? logger({ collapsed: false, diff: true }) : null,
  timeTravel({ limit: env.TIME_TRAVEL_LIMIT })
)
```

## What to Notice

### Development Stage
- ✅ Redux DevTools shows all state changes
- ✅ Console logs are verbose (debug level)
- ✅ Data persists in localStorage
- ✅ Time travel can store 50 states
- ✅ Logger middleware shows diffs

### Production Stage
- ❌ Redux DevTools is disabled
- ❌ Only error logs appear in console
- ⚠️ Data persists in sessionStorage (cleared on tab close)
- ⚠️ Time travel limited to 20 states
- ❌ Logger middleware disabled

## Architecture

```
app.js
├── Environment Configuration (bylyt-env-guard)
│   ├── Schema definition
│   ├── Stage profiles
│   └── Runtime validation
│
├── Store Setup (ichchi-state)
│   ├── Counter Store (with DevTools)
│   ├── Time Travel Store (with middleware)
│   ├── Todo Store (with persistence)
│   └── Async Store (for data fetching)
│
├── UI Components
│   ├── Environment Display
│   ├── Stage Switcher
│   ├── Counter Feature
│   ├── Time Travel Feature
│   ├── Todo List Feature
│   └── Async Loading Feature
│
└── Logging System
    └── Environment-aware logging
```

## Learn More

- [Ichchi State Documentation](https://github.com/yedoma-labs/ichchi-state)
- [Bylyt Env Guard Documentation](https://github.com/yedoma-labs/bylyt-env-guard)

## License

MIT
