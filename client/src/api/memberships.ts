import api from './axios'

export async function recordPayment(gymId: string, paymentData: { member_id: string; plan_type: string; amount: number; payment_method: string }) {
  const { data } = await api.post(`/gym/${gymId}/memberships`, paymentData)
  return data
}

export async function getRenewals(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/memberships/renewals`)
  return data
}

export async function getDashboard(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/dashboard`)
  return data
}
