# Ichchi State Examples

This directory contains various examples demonstrating different features and use cases of `@yedoma-labs/ichchi-state`.

## 🌐 Interactive Demo

**[demo/](./demo)** - Multi-stage application with environment configuration

A comprehensive browser-based demo featuring:
- Two-stage environment setup (development/production)
- Environment configuration using `@yedoma-labs/bylyt-env-guard`
- Counter with Redux DevTools integration
- Time-travel debugging with undo/redo
- Todo list with stage-specific persistence
- Async data loading

```bash
npm run demo
```

Then open http://localhost:5173

## 📝 Code Examples

### Basic Counter
**[counter.ts](./counter.ts)** - Simple counter implementation

```typescript
import { createStore } from '@yedoma-labs/ichchi-state'

const store = createStore({ count: 0 })
store.setState({ count: 1 })
```

### Todo App with React
**[todo-react.tsx](./todo-react.tsx)** - Full-featured Todo application

Demonstrates:
- React hooks integration
- Selector optimization
- Action creators
- Local storage persistence

### Advanced Features
**[advanced-features.tsx](./advanced-features.tsx)** - Comprehensive feature showcase

Demonstrates:
- Multiple stores
- DevTools integration
- Time travel middleware
- Logger middleware
- Custom middleware
- Complex state updates
- Computed values

## 🧪 End-to-End Tests

**[e2e/](./e2e)** - Playwright E2E tests

Browser-based tests covering:
- Counter operations
- Async state management
- Todo list CRUD
- State persistence

```bash
npm run e2e
```

## Running Examples

### TypeScript Examples

The TypeScript examples (`.ts`, `.tsx`) are meant to be viewed as reference code. To run them:

1. **Create a new project** and install dependencies:
```bash
npm install @yedoma-labs/ichchi-state react react-dom
npm install -D typescript @types/react
```

2. **Copy the example code** into your project

3. **Import and use** in your application

### Browser Demo

The interactive demo runs directly in the browser:

```bash
# Start the demo server
npm run demo

# Or use any static server
npx serve examples/demo -l 5173
python3 -m http.server 5173
```

## Learn More

- [Main Documentation](../README.md)
- [API Reference](../README.md#api-reference)
- [Comparison with other libraries](../README.md#comparison)
