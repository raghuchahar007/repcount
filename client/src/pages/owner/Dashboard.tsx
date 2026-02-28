import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function OwnerDashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Owner Dashboard</h1>
      <Card>
        <p className="text-text-secondary text-sm">Logged in as</p>
        <p className="text-lg font-semibold">{user?.full_name || user?.phone}</p>
        <p className="text-text-muted text-sm">Role: {user?.role}</p>
      </Card>
      <Card variant="alert-info">
        <p className="text-sm">Owner features coming in M2. Auth is working!</p>
      </Card>
      <Button variant="danger" fullWidth onClick={logout}>
        Logout
      </Button>
    </div>
  )
}
