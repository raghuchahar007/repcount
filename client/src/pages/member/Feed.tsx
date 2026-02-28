import { useState, useEffect } from 'react'
import { getFeed, joinChallenge } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/shared/Skeleton'
import ErrorCard from '@/components/shared/ErrorCard'
import { NoGymCard } from '@/components/shared/NoGymCard'
import { POST_TYPES } from '@/utils/constants'
import { formatDate } from '@/utils/helpers'

interface FeedPost {
  _id: string
  title: string
  body: string | null
  post_type: 'challenge' | 'event' | 'offer' | 'announcement'
  starts_at: string | null
  ends_at: string | null
  created_at: string
  participantCount: number
  hasJoined: boolean
}

function getPostType(value: string) {
  return POST_TYPES.find((pt) => pt.value === value)
}

export default function FeedPage() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noGym, setNoGym] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)

  function fetchFeed() {
    setLoading(true)
    setError('')
    getFeed()
      .then((data) => setPosts((data.posts || data) as FeedPost[]))
      .catch((err) => {
        if (err?.response?.data?.code === 'NO_GYM') {
          setNoGym(true)
        } else {
          setError(err?.response?.data?.message || 'Failed to load feed')
        }
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchFeed()
  }, [])

  async function handleJoin(postId: string) {
    setJoiningId(postId)

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, hasJoined: true, participantCount: p.participantCount + 1 }
          : p
      )
    )

    try {
      await joinChallenge(postId)
    } catch {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, hasJoined: false, participantCount: p.participantCount - 1 }
            : p
        )
      )
    } finally {
      setJoiningId(null)
    }
  }

  if (loading) return <SkeletonList />

  if (noGym) return <NoGymCard feature="the gym feed" />

  if (error) {
    return (
      <div className="p-4">
        <ErrorCard message={error} onRetry={fetchFeed} />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Feed</h2>
        {posts.length > 0 && (
          <span className="text-xs text-text-muted">{posts.length} posts</span>
        )}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-text-muted text-sm">No posts from your gym yet</p>
            <p className="text-text-muted text-xs mt-1">
              Check back later for challenges, events, and more!
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const pt = getPostType(post.post_type)

            return (
              <Card key={post._id}>
                {/* Post type badge + date */}
                <div className="flex items-center gap-2 mb-2">
                  {pt && (
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${pt.color}`}
                    >
                      {pt.emoji} {pt.label}
                    </span>
                  )}
                  <span className="text-[11px] text-text-muted ml-auto">
                    {formatDate(post.created_at)}
                  </span>
                </div>

                {/* Title */}
                <p className="text-sm font-bold text-text-primary">{post.title}</p>

                {/* Body */}
                {post.body && (
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {post.body}
                  </p>
                )}

                {/* Dates */}
                {(post.starts_at || post.ends_at) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[11px] text-text-muted">📅</span>
                    <p className="text-xs text-text-secondary">
                      {post.starts_at && formatDate(post.starts_at)}
                      {post.starts_at && post.ends_at && ' — '}
                      {post.ends_at && formatDate(post.ends_at)}
                    </p>
                  </div>
                )}

                {/* Challenge footer: participant count + join button */}
                {post.post_type === 'challenge' && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">👥</span>
                      <span className="text-xs text-text-secondary">
                        {post.participantCount}{' '}
                        {post.participantCount === 1 ? 'participant' : 'participants'}
                      </span>
                    </div>

                    {post.hasJoined ? (
                      <Button variant="success" size="sm" disabled>
                        Joined
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        loading={joiningId === post._id}
                        onClick={() => handleJoin(post._id)}
                      >
                        Join Challenge
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
