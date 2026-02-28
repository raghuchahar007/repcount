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
