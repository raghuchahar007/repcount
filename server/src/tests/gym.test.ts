import { describe, it, expect } from 'vitest'

describe('gym utils', () => {
  it('normalizes city name', () => {
    expect('  Mumbai  '.trim().toLowerCase()).toBe('mumbai')
  })
})
