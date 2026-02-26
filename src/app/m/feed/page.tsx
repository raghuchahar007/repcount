'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { GymPost } from '@/lib/types'

const POST_EMOJI: Record<string, string> = {
  challenge: '🏆', event: '🎉', offer: '🎁', announcement: '📢',
}

export default function FeedPage() {
  const [posts, setPosts] = useState<GymPost[]>([])
  const [joinedChallenges, setJoinedChallenges] = useState<Set<string>>(new Set())
  const [memberId, setMemberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => { loadFeed() }, [])

  async function loadFeed() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('members').select('id, gym_id').eq('user_id', user.id).eq('is_active', true).single()
      if (!member) return
      setMemberId(member.id)

      const [postsRes, participantsRes] = await Promise.all([
        supabase.from('gym_posts').select('*').eq('gym_id', member.gym_id).eq('is_published', true).order('created_at', { ascending: false }).limit(20),
        supabase.from('challenge_participants').select('post_id').eq('member_id', member.id),
      ])

      setPosts(postsRes.data || [])
      setJoinedChallenges(new Set((participantsRes.data || []).map(p => p.post_id)))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function joinChallenge(postId: string) {
    if (!memberId) return
    const supabase = createClient()
    const { error: insertError } = await supabase.from('challenge_participants').insert({ post_id: postId, member_id: memberId })
    if (insertError) {
      setJoinError(postId)
      setTimeout(() => setJoinError(null), 3000)
      return
    }
    setJoinedChallenges(prev => new Set([...prev, postId]))
  }

  if (loading) return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>

  if (error) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[40vh] text-center">
      <p className="text-text-secondary text-sm">Something went wrong</p>
      <button onClick={() => { setError(false); setLoading(true); loadFeed() }} className="text-accent-orange text-sm mt-2 font-medium min-h-[44px]">
        Tap to retry
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Feed</h2>

      {posts.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="text-3xl">📭</span>
          <p className="text-text-muted text-sm mt-2">No posts from your gym yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const isChallenge = post.post_type === 'challenge'
            const hasJoined = joinedChallenges.has(post.id)
            const isActive = post.ends_at ? new Date(post.ends_at) > new Date() : true

            return (
              <Card key={post.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{POST_EMOJI[post.post_type] || '📢'}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[11px] text-text-muted uppercase tracking-wider">{post.post_type}</span>
                        <h3 className="text-sm font-semibold text-text-primary">{post.title}</h3>
                      </div>
                      <span className="text-[11px] text-text-muted">
                        {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    {post.body && <p className="text-xs text-text-secondary mt-1">{post.body}</p>}

                    {post.starts_at && (
                      <p className="text-[11px] text-text-muted mt-2">
                        📅 {new Date(post.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {post.ends_at && ` — ${new Date(post.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </p>
                    )}

                    {isChallenge && isActive && (
                      <div className="mt-3">
                        {hasJoined ? (
                          <span className="text-xs text-status-green font-medium">✅ You've joined!</span>
                        ) : (
                          <>
                            <Button size="sm" onClick={() => joinChallenge(post.id)}>
                              Join Challenge
                            </Button>
                            {joinError === post.id && (
                              <p className="text-xs text-status-red mt-1">Failed to join. Try again.</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
