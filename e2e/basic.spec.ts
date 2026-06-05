import { test, expect } from '@playwright/test'

test.describe('Basic Store Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('counter increments and decrements', async ({ page }) => {
    const counter = page.getByTestId('counter')
    
    // Initial state
    await expect(counter).toHaveText('0')
    
    // Increment
    await page.getByTestId('increment').click()
    await expect(counter).toHaveText('1')
    
    await page.getByTestId('increment').click()
    await expect(counter).toHaveText('2')
    
    // Decrement
    await page.getByTestId('decrement').click()
    await expect(counter).toHaveText('1')
    
    // Reset
    await page.getByTestId('reset').click()
    await expect(counter).toHaveText('0')
  })

  test('async state handles loading and success', async ({ page }) => {
    const status = page.getByTestId('async-status')
    const data = page.getByTestId('async-data')
    
    // Initial state
    await expect(status).toHaveText('idle')
    await expect(data).toHaveText('null')
    
    // Fetch success - click and immediately check for loading
    const fetchPromise = page.getByTestId('fetch-success').click()
    // Wait for loading state to appear (should be almost immediate)
    await expect(status).toHaveText('loading', { timeout: 1000 })
    await fetchPromise
    
    // Wait for success
    await expect(status).toHaveText('success', { timeout: 5000 })
    await expect(data).toHaveText('Test Data')
  })

  test('async state handles errors', async ({ page }) => {
    const status = page.getByTestId('async-status')
    const error = page.getByTestId('async-error')
    const data = page.getByTestId('async-data')
    
    // Fetch error - click and immediately check for loading
    const fetchPromise = page.getByTestId('fetch-error').click()
    // Wait for loading state to appear (should be almost immediate)
    await expect(status).toHaveText('loading', { timeout: 1000 })
    await fetchPromise
    
    // Wait for error
    await expect(status).toHaveText('error', { timeout: 5000 })
    await expect(error).toHaveText('Test Error')
    await expect(data).toHaveText('null')
  })
})

test.describe('Todo List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('adds and deletes todos', async ({ page }) => {
    const input = page.getByTestId('todo-input')
    const addBtn = page.getByTestId('add-todo')
    const count = page.getByTestId('todo-count')
    
    // Initial state
    await expect(count).toHaveText('0 todos')
    
    // Add first todo
    await input.fill('Buy milk')
    await addBtn.click()
    await expect(count).toHaveText('1 todos')
    await expect(page.getByTestId('todo-0')).toContainText('Buy milk')
    
    // Add second todo
    await input.fill('Walk dog')
    await addBtn.click()
    await expect(count).toHaveText('2 todos')
    await expect(page.getByTestId('todo-1')).toContainText('Walk dog')
    
    // Delete first todo
    await page.getByTestId('delete-todo-0').click()
    await expect(count).toHaveText('1 todos')
    await expect(page.getByTestId('todo-0')).toContainText('Walk dog')
  })

  test('clears input after adding todo', async ({ page }) => {
    const input = page.getByTestId('todo-input')
    const addBtn = page.getByTestId('add-todo')
    
    await input.fill('Test todo')
    await addBtn.click()
    
    await expect(input).toHaveValue('')
  })
})

test.describe('Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('saves and loads state', async ({ page }) => {
    const value = page.getByTestId('persisted-value')
    
    // Initial state
    await expect(value).toHaveText('initial')
    
    // Save state
    await page.getByTestId('save-state').click()
    await expect(value).toHaveText('saved')
    
    // Load state
    await page.getByTestId('load-state').click()
    await expect(value).toHaveText('saved')
  })

  test('clears persisted state', async ({ page }) => {
    const value = page.getByTestId('persisted-value')
    
    // Save first
    await page.getByTestId('save-state').click()
    await expect(value).toHaveText('saved')
    
    // Clear
    await page.getByTestId('clear-state').click()
    await expect(value).toHaveText('cleared')
    
    // Try to load - should stay cleared
    await page.getByTestId('load-state').click()
    await expect(value).toHaveText('cleared')
  })

  test('persists across page reloads', async ({ page }) => {
    const value = page.getByTestId('persisted-value')
    
    // Save state
    await page.getByTestId('save-state').click()
    await expect(value).toHaveText('saved')
    
    // Reload page
    await page.reload()
    
    // Load persisted state
    await page.getByTestId('load-state').click()
    await expect(value).toHaveText('saved')
    
    // Cleanup
    await page.getByTestId('clear-state').click()
  })
})
