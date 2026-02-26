'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { todayIST } from '@/lib/utils'

interface Metric {
  date: string
  weight: number | null
  chest: number | null
  waist: number | null
  biceps: number | null
}

export default function ProgressPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [memberId, setMemberId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ weight: '', chest: '', waist: '', biceps: '' })

  useEffect(() => { loadProgress() }, [])

  async function loadProgress() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('members').select('id').eq('user_id', user.id).eq('is_active', true).single()
      if (!member) return
      setMemberId(member.id)

      const { data } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('member_id', member.id)
        .order('date', { ascending: false })
        .limit(20)

      setMetrics(data || [])
    } catch {
      // silently handle - page shows empty/fallback state
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!memberId) return
    if (!form.weight && !form.chest && !form.waist && !form.biceps) return

    setSaving(true)
    const supabase = createClient()
    const today = todayIST()

    await supabase.from('progress_metrics').upsert({
      member_id: memberId,
      date: today,
      weight: form.weight ? Number(form.weight) : null,
      chest: form.chest ? Number(form.chest) : null,
      waist: form.waist ? Number(form.waist) : null,
      biceps: form.biceps ? Number(form.biceps) : null,
    }, { onConflict: 'member_id,date' })

    setForm({ weight: '', chest: '', waist: '', biceps: '' })
    setShowForm(false)
    setSaving(false)
    loadProgress()
  }

  const latest = metrics[0]
  const oldest = metrics[metrics.length - 1]
  const weightChange = latest && oldest && latest.weight && oldest.weight
    ? (latest.weight - oldest.weight).toFixed(1)
    : null

  if (loading) return <div className="p-4 space-y-4">{[1, 2].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-text-primary">Progress</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Log'}
        </Button>
      </div>

      {/* Log Form */}
      {showForm && (
        <Card className="p-4 space-y-3 border-accent-orange/30">
          <p className="text-xs font-semibold text-accent-orange uppercase">Log Measurements</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" type="number" placeholder="72" value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
            <Input label="Chest (cm)" type="number" placeholder="95" value={form.chest} onChange={e => setForm(p => ({ ...p, chest: e.target.value }))} />
            <Input label="Waist (cm)" type="number" placeholder="80" value={form.waist} onChange={e => setForm(p => ({ ...p, waist: e.target.value }))} />
            <Input label="Biceps (cm)" type="number" placeholder="32" value={form.biceps} onChange={e => setForm(p => ({ ...p, biceps: e.target.value }))} />
          </div>
          <Button onClick={handleSave} loading={saving} fullWidth>Save</Button>
        </Card>
      )}

      {/* Summary Cards */}
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          {latest.weight && (
            <Card className="p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{latest.weight} kg</p>
              <p className="text-[10px] text-text-secondary">Current Weight</p>
              {weightChange && (
                <p className={`text-xs font-medium mt-1 ${Number(weightChange) < 0 ? 'text-status-green' : Number(weightChange) > 0 ? 'text-status-yellow' : 'text-text-muted'}`}>
                  {Number(weightChange) > 0 ? '+' : ''}{weightChange} kg
                </p>
              )}
            </Card>
          )}
          {latest.chest && (
            <Card className="p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{latest.chest} cm</p>
              <p className="text-[10px] text-text-secondary">Chest</p>
            </Card>
          )}
          {latest.waist && (
            <Card className="p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{latest.waist} cm</p>
              <p className="text-[10px] text-text-secondary">Waist</p>
            </Card>
          )}
          {latest.biceps && (
            <Card className="p-3 text-center">
              <p className="text-xl font-bold text-text-primary">{latest.biceps} cm</p>
              <p className="text-[10px] text-text-secondary">Biceps</p>
            </Card>
          )}
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">History</p>
        {metrics.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="text-3xl">📊</span>
            <p className="text-text-muted text-sm mt-2">No measurements yet</p>
            <p className="text-text-muted text-[10px] mt-1">Start tracking to see your progress</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-1 px-3 py-2 text-[10px] text-text-muted">
              <span>Date</span>
              <span className="text-center">Weight</span>
              <span className="text-center">Chest</span>
              <span className="text-center">Waist</span>
              <span className="text-center">Biceps</span>
            </div>
            {metrics.map(m => (
              <Card key={m.date} className="px-3 py-2.5">
                <div className="grid grid-cols-5 gap-1 text-xs">
                  <span className="text-text-secondary">{new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                  <span className="text-center text-text-primary">{m.weight || '-'}</span>
                  <span className="text-center text-text-primary">{m.chest || '-'}</span>
                  <span className="text-center text-text-primary">{m.waist || '-'}</span>
                  <span className="text-center text-text-primary">{m.biceps || '-'}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
