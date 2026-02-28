const TEST_PHONE = process.env.TEST_PHONE || '+919999999999'
const TEST_OTP = process.env.TEST_OTP || '123456'

const otpStore = new Map<string, { otp: string; expiresAt: number }>()

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
  if (phone === TEST_PHONE) {
    return { success: true, message: 'OTP sent (test mode)' }
  }
  const otp = generateOtp()
  otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 })
  console.log(`[DEV] OTP for ${phone}: ${otp}`)
  return { success: true, message: 'OTP sent' }
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  if (phone === TEST_PHONE && otp === TEST_OTP) {
    return true
  }
  const stored = otpStore.get(phone)
  if (!stored) return false
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone)
    return false
  }
  if (stored.otp !== otp) return false
  otpStore.delete(phone)
  return true
}
