import api from './axios'

export async function getMembers(gymId: string, params?: { search?: string; filter?: string }) {
  const { data } = await api.get(`/gym/${gymId}/members`, { params })
  return data
}

export async function getMember(gymId: string, memberId: string) {
  const { data } = await api.get(`/gym/${gymId}/members/${memberId}`)
  return data
}

export async function addMember(gymId: string, memberData: any) {
  const { data } = await api.post(`/gym/${gymId}/members`, memberData)
  return data
}

export async function updateMember(gymId: string, memberId: string, memberData: any) {
  const { data } = await api.put(`/gym/${gymId}/members/${memberId}`, memberData)
  return data
}

export async function checkInMember(gymId: string, memberId: string) {
  const { data } = await api.post(`/gym/${gymId}/attendance`, { member_id: memberId })
  return data
}

export async function getTodayAttendance(gymId: string) {
  const { data } = await api.get(`/gym/${gymId}/attendance`)
  return data
}
