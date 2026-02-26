'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

export default function VerifyPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [resendTimer, setResendTimer] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const router = useRouter()

  useEffect(() => {
    const storedPhone = sessionStorage.getItem('login_phone')
    if (!storedPhone) {
      router.replace('/login')
      return
    }
    setPhone(storedPhone)
    inputRefs.current[0]?.focus()
  }, [router])

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (newOtp.every(d => d !== '')) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const newOtp = [...otp]
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || ''
    }
    setOtp(newOtp)
    // Focus the next empty input or the last one
    const nextEmpty = newOtp.findIndex(d => d === '')
    inputRefs.current[nextEmpty >= 0 ? nextEmpty : 5]?.focus()
    // Auto-submit if all filled
    if (newOtp.every(d => d !== '')) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('')
    if (otpCode.length !== 6) {
      setError('Please enter the 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: `+91${phone}`,
        token: otpCode,
        type: 'sms',
      })

      if (verifyError) throw verifyError

      // Check if profile exists, create if not
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        if (!profile) {
          // New user — create profile
          await supabase.from('profiles').insert({
            id: data.user.id,
            phone: phone,
            role: 'member', // default role, owner can be set manually
          })
        }

        // Clean up session storage
        const redirect = sessionStorage.getItem('login_redirect')
        sessionStorage.removeItem('login_phone')
        sessionStorage.removeItem('login_redirect')

        // Redirect based on role
        if (redirect) {
          router.replace(redirect)
        } else if (profile?.role === 'owner') {
          router.replace('/owner')
        } else {
          router.replace('/m')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOtp({ phone: `+91${phone}` })
      setResendTimer(30)
      setError('')
    } catch {
      setError('Failed to resend OTP')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Verify OTP</h1>
          <p className="text-text-secondary text-sm">
            Enter the code sent to +91 {phone.slice(0, 2)}****{phone.slice(-2)}
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex justify-center gap-2 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-xl font-bold bg-bg-card border border-border rounded-lg text-text-primary focus:border-accent-orange focus:outline-none transition-colors"
            />
          ))}
        </div>

        {error && (
          <p className="text-status-red text-xs text-center mb-4">{error}</p>
        )}

        <Button
          onClick={() => handleVerify()}
          fullWidth
          loading={loading}
        >
          Verify
        </Button>

        <div className="text-center mt-6">
          {resendTimer > 0 ? (
            <p className="text-text-muted text-sm">
              Resend OTP in {resendTimer}s
            </p>
          ) : (
            <button
              onClick={handleResend}
              className="text-accent-orange text-sm font-medium"
            >
              Resend OTP
            </button>
          )}
        </div>

        <button
          onClick={() => router.back()}
          className="block mx-auto mt-4 text-text-secondary text-sm"
        >
          Change number
        </button>
      </div>
    </div>
  )
}
