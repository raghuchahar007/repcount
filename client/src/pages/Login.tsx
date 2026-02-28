import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { sendOtp } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const cleanPhone = phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length !== 10) {
      setError('Enter a valid 10-digit phone number')
      return
    }

    const fullPhone = `+91${cleanPhone}`
    setLoading(true)
    try {
      await sendOtp(fullPhone)
      navigate('/verify', { state: { phone: fullPhone } })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-orange mb-2">RepCount</h1>
          <p className="text-text-secondary">Your Gym, Upgraded</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Phone Number</label>
            <div className="flex gap-2">
              <div className="bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm text-text-secondary">
                +91
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="9999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoFocus
              />
            </div>
          </div>

          {error && <p className="text-status-red text-sm">{error}</p>}

          <Button type="submit" fullWidth loading={loading} disabled={phone.replace(/\D/g, '').length < 10}>
            Send OTP
          </Button>
        </form>

        <p className="text-center text-text-muted text-xs mt-6">
          We'll send a 6-digit code to verify your number
        </p>
      </div>
    </div>
  )
}
