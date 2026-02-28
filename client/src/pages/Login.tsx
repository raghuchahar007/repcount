import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { sendOtp, loginWithEmail } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Tab = 'email' | 'phone'

export default function Login() {
  const [tab, setTab] = useState<Tab>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  async function handleEmailLogin(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !password) return
    setLoading(true)
    try {
      const data = await loginWithEmail(email, password)
      login(data.accessToken, data.user)
      if (!data.user.role) {
        navigate('/choose-role', { replace: true })
      } else {
        navigate(data.user.role === 'owner' ? '/owner' : '/m', { replace: true })
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhoneSubmit(e: FormEvent) {
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
          <h1 className="text-3xl font-bold text-accent-primary mb-2">RepCount</h1>
          <p className="text-text-secondary">Your Gym, Upgraded</p>
        </div>

        <div className="flex bg-bg-card rounded-xl p-1 mb-6">
          <button
            onClick={() => { setTab('email'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'email' ? 'bg-accent-primary text-white' : 'text-text-secondary'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => { setTab('phone'); setError('') }}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
              tab === 'phone' ? 'bg-accent-primary text-white' : 'text-text-secondary'
            }`}
          >
            Phone
          </button>
        </div>

        {tab === 'email' ? (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-status-red text-sm">{error}</p>}
            <Button type="submit" fullWidth loading={loading} disabled={!email || !password}>
              Login
            </Button>
          </form>
        ) : (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
        )}

        <p className="text-center text-sm text-text-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent-primary font-medium">Register</Link>
        </p>
      </div>
    </div>
  )
}
