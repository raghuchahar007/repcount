import api from './axios'

export async function getMyGym() {
  const { data } = await api.get('/gym/mine')
  return data
}

export async function createGym(gymData: any) {
  const { data } = await api.post('/gym', gymData)
  return data
}

export async function updateGym(gymId: string, gymData: any) {
  const { data } = await api.put(`/gym/${gymId}`, gymData)
  return data
}
