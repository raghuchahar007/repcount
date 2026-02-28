import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getPosts } from '@/api/posts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { formatDate } from '@/utils/helpers'
import { POST_TYPES } from '@/utils/constants'

interface Post {
  _id: string
  post_type: string
  title: string
  body?: string
  starts_at?: string
  ends_at?: string
  is_published: boolean
  created_at: string
}

function getPostType(value: string) {
  return POST_TYPES.find((pt) => pt.value === value)
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const gym = await getMyGym()
        const data = await getPosts(gym._id)
        setPosts(data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load posts')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <LoadingSpinner text="Loading posts..." />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm text-status-red">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-text-primary">Posts</h2>
        <Link to="/owner/posts/create">
          <Button size="sm">+ Create</Button>
        </Link>
      </div>

      {/* List */}
      {posts.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <p className="text-text-muted text-sm">No posts yet</p>
            <Link
              to="/owner/posts/create"
              className="text-accent-orange text-sm font-semibold mt-2 inline-block"
            >
              Create your first post
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const pt = getPostType(post.post_type)

            return (
              <Card key={post._id}>
                <div className="flex items-center gap-2 mb-1.5">
                  {pt && (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${pt.color}`}>
                      {pt.emoji} {pt.label}
                    </span>
                  )}
                  <span className="text-[11px] text-text-muted">
                    {new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <p className="text-sm font-medium text-text-primary">
                  {post.title}
                </p>

                {post.body && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">
                    {post.body}
                  </p>
                )}

                {(post.starts_at || post.ends_at) && (
                  <p className="text-xs text-text-secondary mt-1.5">
                    {post.starts_at && formatDate(post.starts_at)}
                    {post.starts_at && post.ends_at && ' — '}
                    {post.ends_at && formatDate(post.ends_at)}
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
