import { describe, it, expect } from 'vitest'

function isDuplicateKeyError(err: any): boolean {
  return err?.code === 11000
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

describe('attendance utils', () => {
  it('detects duplicate key error', () => {
    expect(isDuplicateKeyError({ code: 11000 })).toBe(true)
    expect(isDuplicateKeyError({ code: 500 })).toBe(false)
  })
  it('formats check-in time', () => {
    const d = new Date('2026-03-05T09:14:00')
    expect(formatTime(d)).toMatch(/9:14/)
  })
})
