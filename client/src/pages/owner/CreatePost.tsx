import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMyGym } from '@/api/gym'
import { createPost } from '@/api/posts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { POST_TYPES } from '@/utils/constants'

const DATE_POST_TYPES = ['challenge', 'event', 'offer']

export default function CreatePostPage() {
  const navigate = useNavigate()

  const [gymId, setGymId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [postType, setPostType] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const gym = await getMyGym()
        setGymId(gym._id)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load gym')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const showDateFields = DATE_POST_TYPES.includes(postType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSubmitting(true)

    try {
      await createPost(gymId, {
        title: title.trim(),
        body: body.trim() || undefined,
        post_type: postType || 'announcement',
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
        is_published: true,
      })
      navigate('/owner/posts')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingSpinner text="Loading..." />

  return (
    <div className="p-4 space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-text-secondary text-sm hover:text-text-primary"
      >
        &larr; Back
      </button>

      {/* Header */}
      <h2 className="text-lg font-bold text-text-primary">Create Post</h2>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Post type grid */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Post Type</label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => setPostType(pt.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border text-left ${
                    postType === pt.value
                      ? 'bg-accent-orange/10 border-accent-orange text-accent-orange'
                      : 'bg-bg-card border-border-light text-text-secondary'
                  }`}
                >
                  {pt.emoji} {pt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <Input
            label="Title"
            placeholder="Post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {/* Description */}
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Description</label>
            <textarea
              placeholder="Post details (optional)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full bg-bg-card border border-border-light rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-orange transition-colors resize-none"
            />
          </div>

          {/* Conditional date fields */}
          {showDateFields && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-status-red">{error}</p>
          )}

          {/* Submit */}
          <Button type="submit" fullWidth loading={submitting}>
            Publish Post
          </Button>
        </form>
      </Card>
    </div>
  )
}
