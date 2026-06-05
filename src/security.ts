/**
 * Security utilities for state management
 * Prevents prototype pollution, injection attacks, and DoS
 */

// Only log security warnings in development
const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'

/**
 * Log security warning (only in development)
 */
export function securityWarn(message: string): void {
  if (isDev) {
    console.warn(message)
  }
}

/**
 * Log security error (always, indicates actual attack)
 */
export function securityError(message: string, error?: unknown): void {
  console.error(message, error)
}

/**
 * Safe JSON.parse that prevents prototype pollution
 * CWE-1321: Improperly Controlled Modification of Object Prototype Attributes
 */
export function safeJSONParse<T = any>(json: string): T | null {
  try {
    return JSON.parse(json, (key, value) => {
      // Block prototype pollution vectors
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        securityWarn(`[Security] Blocked prototype pollution attempt via key: ${key}`)
        return undefined
      }
      return value
    })
  } catch (error) {
    securityError('[Security] JSON.parse failed:', error)
    return null
  }
}

/**
 * Sanitize object by removing dangerous keys
 * Prevents prototype pollution and prototype chain traversal
 */
export function sanitizeObject<T extends object>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj

  const sanitized = { ...obj }
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']

  for (const key of dangerousKeys) {
    if (key in sanitized) {
      delete (sanitized as any)[key]
      securityWarn(`[Security] Removed dangerous key: ${key}`)
    }
  }

  return sanitized
}

/**
 * Validate path for field subscriptions
 * Prevents prototype chain traversal via paths like "__proto__.isAdmin"
 * CWE-22: Improper Limitation of a Pathname
 */
export function validatePath(path: string): boolean {
  const segments = path.split('.')
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']

  for (const segment of segments) {
    if (dangerousKeys.includes(segment)) {
      throw new Error(`[Security] Path contains dangerous segment: ${segment}`)
    }
    // Also check for empty segments
    if (!segment || segment.trim() === '') {
      throw new Error('[Security] Path contains empty segment')
    }
  }

  return true
}

/**
 * Estimate memory size of an object in bytes (rough approximation)
 */
export function estimateSize(obj: any): number {
  const str = JSON.stringify(obj)
  // UTF-16 uses 2 bytes per character
  return str.length * 2
}

/**
 * Rate limiter using token bucket algorithm
 * CWE-770: Allocation of Resources Without Limits or Throttling
 */
export class RateLimiter {
  private tokens: number
  private lastRefill: number

  constructor(
    private maxTokens: number,
    private refillRate: number, // tokens per second
  ) {
    this.tokens = maxTokens
    this.lastRefill = Date.now()
  }

  tryConsume(count: number = 1): boolean {
    this.refill()

    if (this.tokens >= count) {
      this.tokens -= count
      return true
    }

    return false
  }

  private refill(): void {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    const tokensToAdd = timePassed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  reset(): void {
    this.tokens = this.maxTokens
    this.lastRefill = Date.now()
  }
}

/**
 * Check storage quota and size before write
 * CWE-400: Uncontrolled Resource Consumption
 */
export function checkStorageQuota(
  storage: Storage,
  key: string,
  value: string,
  maxSizeKB: number = 500
): { ok: boolean; error?: string } {
  // Check value size
  const sizeKB = (value.length * 2) / 1024
  if (sizeKB > maxSizeKB) {
    return {
      ok: false,
      error: `Value size (${sizeKB.toFixed(1)}KB) exceeds limit (${maxSizeKB}KB)`
    }
  }

  // Try to estimate remaining quota
  try {
    const testKey = `__quota_test_${Date.now()}`
    const testValue = 'x'.repeat(1024 * 100) // 100KB test
    storage.setItem(testKey, testValue)
    storage.removeItem(testKey)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      return {
        ok: false,
        error: 'Storage quota exceeded'
      }
    }
  }

  return { ok: true }
}

/**
 * Deep clone object safely using structuredClone (with fallback)
 * Prevents reference leakage
 */
export function deepClone<T>(obj: T): T {
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(obj)
    } catch (e) {
      // Fall back to JSON method if structuredClone fails
      securityWarn('[Security] structuredClone failed, using JSON fallback')
    }
  }

  // Fallback for environments without structuredClone
  if (obj && typeof obj === 'object') {
    return safeJSONParse(JSON.stringify(obj)) as T
  }

  return obj
}

/**
 * Validate snapshot structure before import
 */
export interface SnapshotStructure {
  id: string
  state: any
  timestamp: number
  label?: string
}

export function validateSnapshot(snapshot: any): snapshot is SnapshotStructure {
  if (!snapshot || typeof snapshot !== 'object') {
    return false
  }

  // Check required fields
  if (typeof snapshot.id !== 'string' || !snapshot.id) {
    return false
  }

  if (typeof snapshot.timestamp !== 'number' || snapshot.timestamp <= 0) {
    return false
  }

  // Sanitize ID (prevent Map key injection)
  if (snapshot.id.includes('__proto__') || snapshot.id.includes('constructor')) {
    securityWarn('[Security] Snapshot ID contains dangerous string')
    return false
  }

  return true
}
