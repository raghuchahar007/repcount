'use client'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import type { Gym } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  gym: Gym & { gym_photos: any[]; reviews: any[] }
  memberCount: number
  avgRating: string | null
  reviewCount: number
}

export default function GymPublicClient({ gym, memberCount, avgRating, reviewCount }: Props) {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-gradient-to-b from-accent-orange/20 to-bg-primary px-4 pt-8 pb-6">
        <div className="max-w-mobile mx-auto">
          {gym.logo_url ? (
            <img src={gym.logo_url} alt={gym.name} className="w-20 h-20 rounded-2xl mx-auto object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-bg-card mx-auto flex items-center justify-center text-3xl font-bold text-accent-orange">
              {gym.name.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-text-primary text-center mt-4">{gym.name}</h1>
          <p className="text-sm text-text-secondary text-center mt-1">{gym.address || gym.city}</p>

          {/* Stats Row */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-xl font-bold text-text-primary">{memberCount}+</p>
              <p className="text-[11px] text-text-secondary">Members</p>
            </div>
            {avgRating && (
              <div className="text-center">
                <p className="text-xl font-bold text-status-yellow">⭐ {avgRating}</p>
                <p className="text-[11px] text-text-secondary">{reviewCount} reviews</p>
              </div>
            )}
            {gym.opening_time && (
              <div className="text-center">
                <p className="text-xl font-bold text-status-green">Open</p>
                <p className="text-[11px] text-text-secondary">{gym.opening_time} - {gym.closing_time}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-mobile mx-auto px-4 space-y-4 pb-8">
        {/* Description */}
        {gym.description && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">About</p>
            <p className="text-sm text-text-secondary leading-relaxed">{gym.description}</p>
          </Card>
        )}

        {/* Pricing */}
        {gym.pricing && Object.keys(gym.pricing).length > 0 && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Pricing</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(gym.pricing).map(([plan, price]) => (
                <div key={plan} className="bg-bg-primary rounded-xl p-3 text-center border border-border">
                  <p className="text-lg font-bold text-accent-orange">{formatCurrency(price as number)}</p>
                  <p className="text-[11px] text-text-secondary capitalize">{plan.replace('_', ' ')}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Facilities */}
        {gym.facilities && gym.facilities.length > 0 && (
          <Card className="p-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Facilities</p>
            <div className="flex flex-wrap gap-2">
              {gym.facilities.map(f => (
                <span key={f} className="bg-bg-primary border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary">
                  {f}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Photos */}
        {gym.gym_photos && gym.gym_photos.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Photos</p>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {gym.gym_photos.map((photo: any) => (
                <img key={photo.id} src={photo.url} alt={photo.caption || ''} className="w-48 h-32 rounded-xl object-cover flex-shrink-0" />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {gym.reviews && gym.reviews.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Reviews</p>
            <div className="space-y-2">
              {gym.reviews.slice(0, 5).map((review: any, i: number) => (
                <Card key={i} className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-status-yellow">{'⭐'.repeat(review.rating)}</span>
                    <span className="text-xs text-text-muted">{review.members?.name || 'Member'}</span>
                  </div>
                  {review.text && <p className="text-xs text-text-secondary">{review.text}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <Card className="p-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Contact</p>
          <div className="space-y-2">
            {gym.phone && (
              <a href={`tel:+91${gym.phone}`} className="flex items-center gap-2 text-sm text-text-secondary">
                📞 +91 {gym.phone}
              </a>
            )}
            {gym.address && (
              <p className="flex items-center gap-2 text-sm text-text-secondary">📍 {gym.address}</p>
            )}
          </div>
        </Card>

        {/* CTA */}
        <div className="space-y-2">
          <Link href={`/gym/${gym.slug}/join`} className="block w-full bg-gradient-to-r from-accent-orange to-accent-orange-dark text-white px-6 py-3 text-base rounded-xl font-semibold text-center active:scale-[0.97] transition-transform">
            Join {gym.name}
          </Link>
          {gym.phone && (
            <a href={`https://wa.me/91${gym.phone}?text=Hi! I found ${gym.name} on RepCount and would like to know more.`} target="_blank" rel="noopener" className="block w-full bg-bg-card border border-border text-text-primary px-6 py-3 text-base rounded-xl font-semibold text-center active:scale-[0.97] transition-transform">
              💬 WhatsApp Enquiry
            </a>
          )}
        </div>

        <p className="text-center text-text-muted text-[11px]">
          Powered by RepCount
        </p>
      </div>
    </div>
  )
}
