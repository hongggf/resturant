import { describe, it, expect } from 'vitest'
import { formatPrice } from './format'

describe('formatPrice', () => {
  it('returns empty string when price is null or undefined', () => {
    expect(formatPrice(undefined)).toBe('')
    expect(formatPrice(undefined, 'USD')).toBe('')
  })

  it('formats valid price with default USD currency', () => {
    const formatted = formatPrice(12.5)
    expect(formatted).toContain('12.50')
    expect(formatted).toContain('$')
  })

  it('formats valid price with custom currency (KHR)', () => {
    const formatted = formatPrice(40000, 'KHR')
    expect(formatted).toBeDefined()
    expect(formatted.length).toBeGreaterThan(0)
  })

  it('formats zero correctly', () => {
    const formatted = formatPrice(0, 'USD')
    expect(formatted).toContain('0.00')
    expect(formatted).toContain('$')
  })
})
