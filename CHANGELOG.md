# [0.2.0](https://github.com/yedoma-labs/ichchi-state/compare/v0.1.3...v0.2.0) (2026-10-27)


### Bug Fixes

* **computed:** resubscribe to store when a listener is added after all were removed ([b01e0f7](https://github.com/yedoma-labs/ichchi-state/commit/b01e0f702a8903b297f3a0dfe7cd83739ec494b6))


### Features

* **store:** add reset() to restore the initial state ([666e10f](https://github.com/yedoma-labs/ichchi-state/commit/666e10f97c6e1ef9e13b3e5aac6e4d9777b7f903))

## [0.1.3](https://github.com/yedoma-labs/ichchi-state/compare/v0.1.2...v0.1.3) (2026-10-26)


### Bug Fixes

* **deps:** update dependencies to latest ([#17](https://github.com/yedoma-labs/ichchi-state/issues/17)) ([f52c95e](https://github.com/yedoma-labs/ichchi-state/commit/f52c95ef1dd307b93c239d95723be0ddc0d1718f))

## [0.1.2](https://github.com/yedoma-labs/ichchi-state/compare/v0.1.1...v0.1.2) (2026-10-10)


### Bug Fixes

* **deps:** override vulnerable transitive dependencies ([#7](https://github.com/yedoma-labs/ichchi-state/issues/7)) ([38c9ad7](https://github.com/yedoma-labs/ichchi-state/commit/38c9ad71290b8ab77e6e06e876bb62aceec8b9be))

## [0.1.1](https://github.com/yedoma-labs/ichchi-state/compare/v0.1.0...v0.1.1) (2026-10-10)


### Bug Fixes

* typescript 6.0.3 compatibility - add ignoreDeprecations and types config ([fb4d65e](https://github.com/yedoma-labs/ichchi-state/commit/fb4d65ecbc599629da29646c05b7fd7b282efc2b))

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
