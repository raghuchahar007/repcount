import { useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !email || !password) {
      setError('Name, email and password are required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    const fullPhone = phone.replace(/\D/g, '').length === 10
      ? `+91${phone.replace(/\D/g, '')}`
      : undefined
    setLoading(true)
    try {
      const data = await register(name.trim(), email, password, fullPhone)
      login(data.accessToken, data.user)
      navigate('/choose-role', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-primary mb-2">GymRep</h1>
          <p className="text-text-secondary">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            placeholder="Rahul Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="rahul@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Phone (optional)</label>
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
              />
            </div>
          </div>

          {error && <p className="text-status-red text-sm">{error}</p>}

          <Button type="submit" fullWidth loading={loading} disabled={!name.trim() || !email || !password}>
            Create Account
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link to="/login" className="text-text-secondary text-sm">
            Already have an account? <span className="text-accent-primary font-medium">Login</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
