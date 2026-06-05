import type { DevToolsConnection } from './types'

interface ReduxDevToolsExtension {
  connect: (options: { name: string }) => DevToolsConnection
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevToolsExtension
  }
}

export function createDevTools(name: string) {
  if (typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
    return null
  }

  const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name })

  return {
    init: (state: unknown) => devTools.init(state),
    send: (action: { type: string; payload?: unknown }, state: unknown) => {
      devTools.send(action, state)
    },
  }
}
