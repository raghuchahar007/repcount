import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export interface GymCard {
  slug: string
  name: string
  city: string | null
  logo_url: string | null
  facilities: string[]
  timing_mode: 'slots' | '24x7'
  timing_slots: { label: string; open: string; close: string }[]
  description: string | null
}

export async function getPublicGyms(): Promise<GymCard[]> {
  const { data } = await axios.get(`${baseURL}/public/gyms`)
  return data.data
}

export async function submitGymClaim(gymId: string, claimData: {
  claimant_name: string
  claimant_phone: string
  claimant_email: string
  reason: string
}) {
  const { data } = await axios.post(`${baseURL}/public/gym/${gymId}/claim`, claimData)
  return data
}

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
