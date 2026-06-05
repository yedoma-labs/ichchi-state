# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-05

### Added
- Initial release of `@yedoma-labs/ichchi-state`
- Core state management with TypeScript-first API
- Redux DevTools integration with time-travel debugging
- Built-in persistence support (localStorage/sessionStorage)
- Middleware system (logger, time-travel, thunk, debounce)
- React bindings with `useStore` and `useStoreSelector` hooks
- Context provider support for React
- Comprehensive test suite (258 tests, 94.73% coverage)
- E2E tests with Playwright
- Interactive demo with multi-stage environment configuration
- Full TypeScript type inference
- < 3KB gzipped bundle size
- Framework-agnostic core
- Security hardening (all known vulnerabilities fixed)
- MIT License

### Features
- **State Management**: Simple `createStore` API with immutable updates
- **DevTools**: Built-in Redux DevTools support
- **Persistence**: Automatic state persistence with versioning
- **Time Travel**: Undo/redo functionality via middleware
- **React Integration**: Hooks and context providers
- **Middleware**: Extensible middleware system
- **TypeScript**: Full type safety and inference
- **Performance**: Optimized for minimal bundle size
- **Testing**: Comprehensive test coverage

[0.1.0]: https://github.com/yedoma-labs/ichchi-state/releases/tag/v0.1.0
