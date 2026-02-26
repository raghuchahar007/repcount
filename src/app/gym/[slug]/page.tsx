import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import GymPublicClient from './GymPublicClient'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = await createServerSupabaseClient()
  const { data: gym } = await supabase
    .from('gyms')
    .select('name, description, city')
    .eq('slug', params.slug)
    .single()

  if (!gym) return { title: 'Gym Not Found | RepCount' }

  return {
    title: `${gym.name} — RepCount`,
    description: gym.description || `Join ${gym.name}${gym.city ? ` in ${gym.city}` : ''} on RepCount`,
    openGraph: {
      title: gym.name,
      description: gym.description || `Join ${gym.name} on RepCount`,
    },
  }
}

export default async function GymPublicPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabaseClient()

  const { data: gym } = await supabase
    .from('gyms')
    .select('*, gym_photos(*), reviews(rating, text, members(name))')
    .eq('slug', params.slug)
    .single()

  if (!gym) notFound()

  // Get member count & avg rating
  const [memberCountRes, avgRatingRes] = await Promise.all([
    supabase.from('members').select('id', { count: 'exact' }).eq('gym_id', gym.id).eq('is_active', true),
    supabase.from('reviews').select('rating').eq('gym_id', gym.id),
  ])

  const memberCount = memberCountRes.count || 0
  const ratings = avgRatingRes.data || []
  const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1) : null

  return (
    <GymPublicClient
      gym={gym}
      memberCount={memberCount}
      avgRating={avgRating}
      reviewCount={ratings.length}
    />
  )
}
