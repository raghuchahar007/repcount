import { describe, it, expect } from 'vitest'

function normalizeCity(city: string): string {
  return city.trim().toLowerCase()
}

describe('gym city normalization', () => {
  it('trims and lowercases city', () => {
    expect(normalizeCity('  Mumbai  ')).toBe('mumbai')
    expect(normalizeCity('Delhi')).toBe('delhi')
  })
})
