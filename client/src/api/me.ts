import api from './axios'

export async function getHome() {
  const { data } = await api.get('/me/home')
  return data
}

export async function getProfile() {
  const { data } = await api.get('/me/profile')
  return data
}

export async function updateProfile(updates: { goal?: string; diet_pref?: string }) {
  const { data } = await api.put('/me/profile', updates)
  return data
}

export async function getFeed() {
  const { data } = await api.get('/me/feed')
  return data
}

export async function joinChallenge(postId: string) {
  const { data } = await api.post(`/me/feed/${postId}/join`)
  return data
}

export async function getLeaderboard() {
  const { data } = await api.get('/me/leaderboard')
  return data
}

export async function joinGym(slug: string) {
  const { data } = await api.post('/me/join-gym', { slug })
  return data
}

export async function getMyGyms() {
  const { data } = await api.get('/me/gyms')
  return data
}

export async function selfCheckIn(gymId: string) {
  const { data } = await api.post('/me/check-in', { gymId })
  return data
}

export async function discoverGyms(q?: string) {
  const { data } = await api.get('/public/gyms', { params: q ? { q } : {} })
  return data
}

export async function requestJoinGym(slug: string) {
  const { data } = await api.post(`/public/gym/${slug}/request-join`)
  return data
}

export async function getJoinStatus() {
  const { data } = await api.get('/me/join-status')
  return data
}
