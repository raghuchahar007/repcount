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
