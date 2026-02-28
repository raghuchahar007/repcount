import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { getPosts, deletePost } from '@/api/posts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SkeletonList } from '@/components/shared/Skeleton'
import ErrorCard from '@/components/shared/ErrorCard'
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
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [gymId, setGymId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchPosts() {
    setLoading(true)
    setError('')
    try {
      const gym = await getMyGym()
      setGymId(gym._id)
      const data = await getPosts(gym._id)
      setPosts(data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  async function handleDelete(postId: string) {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    try {
      await deletePost(gymId, postId)
      setPosts((prev) => prev.filter((p) => p._id !== postId))
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete post')
    }
  }

  if (loading) return <SkeletonList count={3} />

  if (error) {
    return (
      <div className="p-4">
        <ErrorCard message={error} onRetry={fetchPosts} />
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
              className="text-accent-primary text-sm font-semibold mt-2 inline-block"
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
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
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
                  </div>

                  {/* Edit & Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => navigate(`/owner/posts/edit/${post._id}`)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                      title="Edit post"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(post._id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                      title="Delete post"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                      </svg>
                    </button>
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
