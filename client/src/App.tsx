import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import Login from '@/pages/Login'
import VerifyOtp from '@/pages/VerifyOtp'
import OwnerDashboard from '@/pages/owner/Dashboard'
import MemberHome from '@/pages/member/Home'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'owner' ? '/owner' : '/m'} replace />
}

export default function App() {
  return (
    <div className="max-w-mobile mx-auto min-h-screen">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyOtp />} />

        <Route path="/owner" element={
          <ProtectedRoute requiredRole="owner">
            <OwnerDashboard />
          </ProtectedRoute>
        } />

        <Route path="/m" element={
          <ProtectedRoute requiredRole="member">
            <MemberHome />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
