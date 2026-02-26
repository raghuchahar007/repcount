'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

function LoginForm() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneHint, setPhoneHint] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        phone: `+91${cleanPhone}`,
      })

      if (authError) throw authError

      // Store phone and redirect in session storage for verify page
      sessionStorage.setItem('login_phone', cleanPhone)
      const redirect = searchParams.get('redirect')
      if (redirect) sessionStorage.setItem('login_redirect', redirect)

      router.push('/login/verify')
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-accent-orange mb-2">RepCount</h1>
          <p className="text-text-secondary text-sm">Your gym, upgraded.</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSendOTP} className="space-y-5">
          <div>
            <label className="block text-xs text-text-secondary mb-2">Phone Number</label>
            <div className="flex gap-2">
              <div className="flex items-center px-3 bg-bg-card border border-border rounded-lg text-text-secondary text-sm">
                +91
              </div>
              <Input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => {
                  const raw = e.target.value
                  const cleaned = raw.replace(/\D/g, '').slice(0, 10)
                  setPhone(cleaned)
                  if (raw !== cleaned && raw.length > 0) {
                    setPhoneHint('Numbers only')
                    setTimeout(() => setPhoneHint(''), 1500)
                  }
                }}
                maxLength={10}
                inputMode="numeric"
                pattern="[0-9]*"
                className="flex-1"
                error={phoneHint || undefined}
              />
            </div>
          </div>

          {error && (
            <p className="text-status-red text-xs">{error}</p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            Send OTP
          </Button>
        </form>

        <p className="text-center text-text-muted text-xs mt-8">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <LoginForm />
    </Suspense>
  )
}
