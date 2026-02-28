/** Returns today's date as YYYY-MM-DD in IST (Asia/Kolkata) */
export function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Returns today's date as ISO start-of-day in IST: YYYY-MM-DDT00:00:00+05:30 */
export function todayISTTimestamp(): string {
  return `${todayIST()}T00:00:00+05:30`
}

/** Converts a TIMESTAMPTZ ISO string to IST date string (YYYY-MM-DD) */
export function toISTDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

/** Returns current day name in IST (e.g., "Monday") */
export function currentDayIST(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' })
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function daysUntil(date: string | Date): number {
  const nowIST = todayIST()
  const nowMs = new Date(nowIST + 'T00:00:00+05:30').getTime()
  const targetMs = new Date(new Date(date).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) + 'T00:00:00+05:30').getTime()
  return Math.ceil((targetMs - nowMs) / (1000 * 60 * 60 * 24))
}

export function daysSince(date: string | Date): number {
  return -daysUntil(date)
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 10) return `${clean.slice(0, 5)} ${clean.slice(5)}`
  if (clean.length === 12 && clean.startsWith('91')) return `${clean.slice(2, 7)} ${clean.slice(7)}`
  return phone
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return '??'
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function getMembershipStatus(expiryDate: string): 'active' | 'expiring' | 'expired' {
  const days = daysUntil(expiryDate)
  if (days < 0) return 'expired'
  if (days <= 7) return 'expiring'
  return 'active'
}
