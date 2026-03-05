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

export async function getTodayAttendance(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/attendance/today`)
  return data as { data: { member?: { name: string }; checked_in_at: string }[]; count: number }
}

export async function getBusyHours(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/attendance/busy-hours`)
  return data.data as { hour: number; count: number }[]
}
