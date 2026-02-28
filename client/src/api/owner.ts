import api from './axios'

export async function getLeads(gymId: string, params?: { status?: string; source?: string }) {
  const { data } = await api.get(`/gym/${gymId}/leads`, { params })
  return data
}

export async function approveJoinRequest(gymId: string, leadId: string) {
  const { data } = await api.put(`/gym/${gymId}/leads/${leadId}/approve`)
  return data
}

export async function rejectJoinRequest(gymId: string, leadId: string) {
  const { data } = await api.put(`/gym/${gymId}/leads/${leadId}/reject`)
  return data
}

export const convertLead = (gymId: string, leadId: string) =>
  api.post(`/gym/${gymId}/leads/${leadId}/convert`).then(r => r.data)
