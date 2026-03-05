import { describe, it, expect } from 'vitest'

const DEFAULT_PLAN_TYPES = [
  { id: 'strength', name: 'Strength' },
  { id: 'strength_cardio', name: 'Strength + Cardio' },
]
const DEFAULT_TIMING_SLOTS = [
  { label: 'Morning', open: '06:00', close: '12:00' },
  { label: 'Evening', open: '16:00', close: '22:00' },
]

describe('Gym defaults', () => {
  it('has correct default plan types', () => {
    expect(DEFAULT_PLAN_TYPES).toHaveLength(2)
    expect(DEFAULT_PLAN_TYPES[0].id).toBe('strength')
  })
  it('has correct default timing slots', () => {
    expect(DEFAULT_TIMING_SLOTS[0].label).toBe('Morning')
    expect(DEFAULT_TIMING_SLOTS[1].open).toBe('16:00')
  })
})
