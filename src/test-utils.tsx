/**
 * Test utilities for React component testing
 */
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { ReactElement } from 'react'

/**
 * Custom render function that wraps components with common providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { ...options })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
