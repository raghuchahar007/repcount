import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import Login from '@/pages/Login'
import VerifyOtp from '@/pages/VerifyOtp'
import OwnerLayout from '@/components/layout/OwnerLayout'
import OwnerDashboard from '@/pages/owner/Dashboard'
import MembersPage from '@/pages/owner/Members'
import AddMemberPage from '@/pages/owner/AddMember'
import MemberDetailPage from '@/pages/owner/MemberDetail'
import RenewalsPage from '@/pages/owner/Renewals'
import LeadsPage from '@/pages/owner/Leads'
import PostsPage from '@/pages/owner/Posts'
import CreatePostPage from '@/pages/owner/CreatePost'
import SettingsPage from '@/pages/owner/Settings'
import ChooseRole from '@/pages/ChooseRole'
import JoinGymPage from '@/pages/member/JoinGym'
import GymPage from '@/pages/public/GymPage'
import MemberLayout from '@/components/layout/MemberLayout'
import MemberHome from '@/pages/member/Home'
import LeaderboardPage from '@/pages/member/Leaderboard'
import DietPage from '@/pages/member/Diet'
import WorkoutPage from '@/pages/member/Workout'
import FeedPage from '@/pages/member/Feed'
import ProfilePage from '@/pages/member/Profile'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (!user.role) return <Navigate to="/choose-role" replace />
  return <Navigate to={user.role === 'owner' ? '/owner' : '/m'} replace />
}

export default function App() {
  return (
    <div className="max-w-mobile mx-auto min-h-screen">
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/choose-role" element={<ChooseRole />} />

        <Route path="/owner" element={
          <ProtectedRoute requiredRole="owner">
            <OwnerLayout />
          </ProtectedRoute>
        }>
          <Route index element={<OwnerDashboard />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="members/add" element={<AddMemberPage />} />
          <Route path="members/:id" element={<MemberDetailPage />} />
          <Route path="renewals" element={<RenewalsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="posts" element={<PostsPage />} />
          <Route path="posts/create" element={<CreatePostPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/m" element={
          <ProtectedRoute requiredRole="member">
            <MemberLayout />
          </ProtectedRoute>
        }>
          <Route index element={<MemberHome />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="diet" element={<DietPage />} />
          <Route path="workout" element={<WorkoutPage />} />
          <Route path="feed" element={<FeedPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="join-gym" element={<JoinGymPage />} />
        </Route>

        <Route path="/gym/:slug" element={<GymPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
