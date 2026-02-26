import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import GymPublicClient from './GymPublicClient'

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
