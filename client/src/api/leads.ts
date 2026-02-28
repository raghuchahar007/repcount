import api from './axios'

export async function getLeads(gymId: string, params?: { status?: string; source?: string; page?: number; limit?: number }) {
  const { data } = await api.get(`/gym/${gymId}/leads`, { params })
  return data
}

export async function createLead(gymId: string, leadData: any) {
  const { data } = await api.post(`/gym/${gymId}/leads`, leadData)
  return data
}

export async function updateLead(gymId: string, leadId: string, leadData: any) {
  const { data } = await api.put(`/gym/${gymId}/leads/${leadId}`, leadData)
  return data
}
