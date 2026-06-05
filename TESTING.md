# Testing Guide

Comprehensive testing documentation for @yedoma-labs/ichchi-state.

## 📊 Quick Stats

```
✅ Test Files:    7
✅ Tests:         59 passing
✅ Coverage:      62.7%
✅ Benchmarks:    27 performance tests
✅ E2E Tests:     11 browser tests
✅ CI/CD:         Fully automated
⚡ Execution:     ~4 seconds
```

## Test Suite

The project uses [Vitest](https://vitest.dev/) for testing with the following setup:

- **Test Runner**: Vitest 2.1.9
- **Environment**: happy-dom (for React/DOM testing)
- **Coverage**: v8 provider
- **Test Files**: `src/**/*.test.{ts,tsx}`

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

## Test Coverage

Current coverage (as of last run):

- **Overall**: ~62%
- **Store Core**: 94%
- **Middleware**: 84%
- **Persistence**: 82%
- **Snapshots**: 90%
- **Batch Updates**: 93%

### Coverage by Module

| Module | Coverage | Notes |
|--------|----------|-------|
| store.ts | 94% | Core store functionality |
| middleware.ts | 84% | Logger, debounce, timeTravel |
| persist.ts | 82% | localStorage persistence |
| snapshots.ts | 90% | State snapshots & diffing |
| batch-updates.ts | 93% | Batched state updates |
| async-state.ts | 71% | Async operations with retry |
| optimistic-updates.ts | 85% | Optimistic UI updates |
| history-branching.ts | 66% | Git-like history |
| cross-tab-sync.ts | 68% | Cross-tab state sync |
| computed.ts | 64% | Computed/derived values |
| field-subscriptions.ts | 48% | Field-level subscriptions |
| react.ts | 7% | React integration (needs better mocking) |
| react-advanced.ts | 5% | Advanced React hooks |
| devtools.ts | 8% | Browser DevTools integration |

## Test Files

### Core Tests

- **`store.test.ts`**: Tests for core store functionality
  - Store creation and initialization
  - State updates (direct and functional)
  - Listener subscriptions and unsubscriptions
  - Middleware application

- **`middleware.test.ts`**: Tests for built-in middleware
  - Logger middleware
  - Debounce middleware
  - Time travel middleware (undo/redo)

### Advanced Feature Tests

- **`advanced.test.ts`**: Integration tests for advanced features
  - Computed values
  - Field subscriptions
  - Optimistic updates
  - Async state management
  - Batch updates
  - Snapshots and diffing
  - History branching

### Persistence & Sync Tests

- **`persist.test.ts`**: Tests for state persistence
  - Save and hydrate from localStorage
  - Custom storage adapters
  - Corrupted data handling
  - Store lifecycle integration

- **`cross-tab-sync.test.ts`**: Tests for cross-tab synchronization
  - State sync via localStorage events
  - Custom sync delays
  - State filtering
  - Independent sync keys

### React Integration Tests

- **`react.test.tsx`**: Basic React hook tests
  - Store subscriptions
  - Selector functions
  - Component lifecycle

## Testing Best Practices

### Writing Tests

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Test isolation**: Each test should be independent
3. **Mock external dependencies**: Mock browser APIs, timers, etc.
4. **Test behavior, not implementation**: Focus on public API

### Example Test

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createStore } from './store'

describe('Feature', () => {
  it('should do something', () => {
    // Arrange
    const store = createStore({ count: 0 })
    const listener = vi.fn()
    
    // Act
    store.subscribe(listener)
    store.setState({ count: 1 })
    
    // Assert
    expect(listener).toHaveBeenCalledWith({ count: 1 }, { count: 0 })
    expect(store.getState().count).toBe(1)
  })
})
```

## Continuous Integration

Tests run automatically on:
- Every push to `main` branch
- Every pull request
- Node.js 20 and 22 (matrix testing)

See `.github/workflows/ci.yml` for full CI configuration.

## Mocking

### Browser APIs

The test suite mocks browser APIs when needed:

- **localStorage**: In-memory mock for persistence tests
- **BroadcastChannel**: Custom mock for cross-tab sync tests
- **window.crypto**: For UUID generation in history branching

### React

React hooks are mocked for basic testing. For integration tests with actual React components, use `@testing-library/react`.

## Coverage Goals

Target coverage levels:
- **Core features** (store, middleware): 90%+
- **Advanced features**: 70%+
- **Browser-specific code**: 50%+ (harder to test without real browser)
- **React hooks**: 80%+ (requires better integration testing)

## Adding New Tests

When adding new features:

1. Create test file: `src/feature.test.ts`
2. Import testing utilities: `vitest`, mocks
3. Write unit tests for public API
4. Add integration tests in `advanced.test.ts` if applicable
5. Run tests locally before committing
6. Ensure CI passes

## Debugging Tests

```bash
# Run specific test file
npm test src/store.test.ts

# Run tests matching pattern
npm test -- --grep "should update"

# Run with debugging
node --inspect-brk node_modules/.bin/vitest
```

## Known Limitations

1. **DevTools**: Hard to test without real browser environment (8% coverage)
2. **React advanced hooks**: Some advanced hooks need more coverage (5%)
3. **Field subscriptions**: Nested path testing could be expanded (48%)
4. **Async edge cases**: Some retry and error handling paths need more coverage

## Implementation History

### Phase 1: Foundation ✅
- Fixed 3 failing tests
- Added 19 new unit tests
- Created CI/CD workflows
- Achieved 62% coverage

### Phase 2: React Testing ✅
- Integrated React Testing Library
- Added 10 comprehensive component tests
- Improved React coverage from 7% → 50%
- Created test utilities

### Phase 3: Performance ✅
- Added 27 performance benchmarks
- Established baseline metrics
- Tested realistic app patterns

### Phase 4: E2E Testing ✅
- Set up Playwright
- Created 11 browser tests
- Validated real user flows

### Phase 5: Polish ✅
- Updated .gitignore
- Consolidated documentation
- Ready for production

## Future Enhancements

- [ ] Visual regression testing (Percy/Chromatic)
- [ ] Mutation testing (Stryker)
- [ ] Property-based testing (fast-check)
- [ ] Accessibility testing (axe-core)
- [ ] Memory leak detection
- [ ] Bundle size tracking (size-limit)
