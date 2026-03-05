import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginWithEmail } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, user, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      navigate(user.role === 'owner' ? '/owner' : '/m', { replace: true })
    }
  }, [user, authLoading, navigate])

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-accent-primary mb-2">GymRep</h1>
          <p className="text-text-secondary">Your Gym, Upgraded</p>
        </div>

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

        <p className="text-center text-sm text-text-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent-primary font-medium">Register</Link>
        </p>
      </div>
    </div>
  )
}
