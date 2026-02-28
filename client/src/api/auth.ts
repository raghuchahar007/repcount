import api, { setAccessToken } from './axios'

export async function sendOtp(phone: string) {
  const { data } = await api.post('/auth/send-otp', { phone })
  return data
}

export async function verifyOtp(phone: string, otp: string) {
  const { data } = await api.post('/auth/verify-otp', { phone, otp })
  setAccessToken(data.accessToken)
  return data
}

export async function logout() {
  await api.post('/auth/logout')
  setAccessToken(null)
}

export async function refreshToken() {
  const { data } = await api.post('/auth/refresh')
  setAccessToken(data.accessToken)
  return data
}

export async function setRole(role: 'owner' | 'member') {
  const { data } = await api.put('/auth/set-role', { role })
  setAccessToken(data.accessToken)
  return data
}

export async function register(name: string, email: string, password: string, phone?: string) {
  const { data } = await api.post('/auth/register', { name, email, password, phone: phone || undefined })
  setAccessToken(data.accessToken)
  return data
}

export async function loginWithEmail(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password })
  setAccessToken(data.accessToken)
  return data
}
