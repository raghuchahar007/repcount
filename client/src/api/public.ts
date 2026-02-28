import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export async function getPublicGym(slug: string) {
  const { data } = await axios.get(`${baseURL}/public/gym/${slug}`)
  return data
}

export async function getPublicPosts(slug: string) {
  const { data } = await axios.get(`${baseURL}/public/gym/${slug}/posts`)
  return data
}

export async function submitLead(slug: string, leadData: { name: string; phone: string; goal?: string }) {
  const { data } = await axios.post(`${baseURL}/public/gym/${slug}/leads`, leadData)
  return data
}
