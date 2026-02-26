'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { POST_TYPES } from '@/lib/constants'
import Link from 'next/link'
import type { GymPost } from '@/lib/types'

export default function PostsPage() {
  const [posts, setPosts] = useState<GymPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { loadPosts() }, [])

  async function loadPosts() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: gym } = await supabase
        .from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) return

      const { data } = await supabase
        .from('gym_posts')
        .select('*')
        .eq('gym_id', gym.id)
        .order('created_at', { ascending: false })

      setPosts(data || [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const getPostType = (type: string) => POST_TYPES.find(t => t.value === type) || POST_TYPES[3]

  if (error) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[40vh] text-center">
      <p className="text-text-secondary text-sm">Something went wrong</p>
      <button onClick={() => { setError(false); setLoading(true); loadPosts() }} className="text-accent-orange text-sm mt-2 font-medium min-h-[44px]">
        Tap to retry
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-text-primary">Posts</h2>
        <Link href="/owner/posts/create" className="bg-gradient-to-r from-accent-orange to-accent-orange-dark text-white px-3 py-1.5 text-xs rounded-xl font-semibold active:scale-[0.97] transition-transform">+ Create</Link>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const pt = getPostType(post.post_type)
            return (
              <Card key={post.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${pt.color}`}>{pt.emoji} {pt.label}</span>
                  <span className="text-[11px] text-text-muted">
                    {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-text-primary mb-1">{post.title}</h3>
                {post.body && <p className="text-xs text-text-secondary line-clamp-2">{post.body}</p>}
                {post.starts_at && (
                  <p className="text-[11px] text-text-muted mt-2">
                    {new Date(post.starts_at).toLocaleDateString('en-IN')} — {post.ends_at ? new Date(post.ends_at).toLocaleDateString('en-IN') : 'Ongoing'}
                  </p>
                )}
              </Card>
            )
          })}
          {posts.length === 0 && (
            <Card className="p-8 text-center">
              <span className="text-3xl">📝</span>
              <p className="text-text-muted text-sm mt-2">No posts yet</p>
              <Link href="/owner/posts/create" className="text-accent-orange text-xs mt-1 inline-block">
                Create your first post
              </Link>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
