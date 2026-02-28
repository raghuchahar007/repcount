import api from './axios'

export async function getLeads(gymId: string, status?: string) {
  const { data } = await api.get(`/gym/${gymId}/leads`, { params: status && status !== 'all' ? { status } : undefined })
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
