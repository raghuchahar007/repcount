'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { POST_TYPES } from '@/lib/constants'

export default function CreatePostPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    body: '',
    post_type: 'announcement',
    starts_at: '',
    ends_at: '',
  })

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Title is required')

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: gym } = await supabase
        .from('gyms').select('id').eq('owner_id', user.id).single()
      if (!gym) throw new Error('No gym found')

      const { error: insertError } = await supabase.from('gym_posts').insert({
        gym_id: gym.id,
        author_id: user.id,
        title: form.title.trim(),
        body: form.body.trim() || null,
        post_type: form.post_type,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
        is_published: true,
      })

      if (insertError) throw new Error(insertError.message || 'Failed to create post')

      router.push('/owner/posts')
    } catch (err: any) {
      setError(err.message || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4">
      <button onClick={() => router.back()} className="text-text-secondary text-sm mb-4 min-h-[44px] inline-flex items-center">← Back</button>
      <h2 className="text-lg font-bold text-text-primary mb-4">Create Post</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-text-secondary mb-2">Post Type</label>
            <div className="grid grid-cols-2 gap-2">
              {POST_TYPES.map(pt => (
                <button
                  key={pt.value}
                  type="button"
                  onClick={() => update('post_type', pt.value)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    form.post_type === pt.value
                      ? 'bg-accent-orange text-white'
                      : 'bg-bg-hover text-text-secondary border border-border'
                  }`}
                >
                  {pt.emoji} {pt.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Title"
            placeholder="e.g., 30-Day Fitness Challenge!"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />

          <div>
            <label className="block text-xs text-text-secondary mb-2">Description</label>
            <textarea
              placeholder="Tell your members about this..."
              value={form.body}
              onChange={(e) => update('body', e.target.value)}
              rows={4}
              className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-orange focus:outline-none resize-none"
            />
          </div>

          {(form.post_type === 'challenge' || form.post_type === 'event' || form.post_type === 'offer') && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={form.starts_at}
                onChange={(e) => update('starts_at', e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={form.ends_at}
                onChange={(e) => update('ends_at', e.target.value)}
              />
            </div>
          )}
        </Card>

        {error && <p className="text-status-red text-xs text-center">{error}</p>}

        <Button type="submit" fullWidth size="lg" loading={loading}>
          Publish Post
        </Button>
      </form>
    </div>
  )
}
