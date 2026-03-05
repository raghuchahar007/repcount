import { describe, it, expect } from 'vitest'

function buildGymCard(gym: any) {
  return {
    slug: gym.slug,
    name: gym.name,
    city: gym.city,
    logo_url: gym.logo_url,
    facilities: gym.facilities,
    timing_mode: gym.timing_mode,
    timing_slots: gym.timing_slots,
  }
}

describe('buildGymCard', () => {
  it('returns correct shape', () => {
    const gym = {
      slug: 'test-gym',
      name: 'Test Gym',
      city: 'mumbai',
      logo_url: null,
      facilities: ['Cardio'],
      timing_mode: 'slots',
      timing_slots: [{ label: 'Morning', open: '06:00', close: '12:00' }],
      owner: 'secret',
      pricing: {},
    }
    const card = buildGymCard(gym)
    expect(card).not.toHaveProperty('owner')
    expect(card).not.toHaveProperty('pricing')
    expect(card.slug).toBe('test-gym')
  })
})
