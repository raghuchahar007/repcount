'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'

interface LeaderboardEntry {
  member_id: string
  member_name: string
  check_ins: number
  rank: number
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => { loadLeaderboard() }, [period])

  async function loadLeaderboard() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('members').select('id, gym_id').eq('user_id', user.id).eq('is_active', true).single()
      if (!member) return
      setCurrentMemberId(member.id)

      // Try RPC first (requires migration 002_leaderboard_rpc.sql)
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)

      const { data: rpcData, error: rpcError } = await supabase.rpc('get_leaderboard', {
        p_gym_id: member.gym_id,
        p_since: period === 'month' ? monthStart.toISOString() : null,
      })

      if (!rpcError && rpcData) {
        // Use RPC result
        const sorted = rpcData.map((entry: any, i: number) => ({
          member_id: entry.member_id,
          member_name: entry.member_name,
          check_ins: Number(entry.check_ins),
          rank: i + 1,
        }))
        setLeaderboard(sorted)
      } else {
        // Fallback: fetch with limit
        let query = supabase
          .from('attendance')
          .select('member_id, members(name)')
          .eq('gym_id', member.gym_id)
          .limit(5000)

        if (period === 'month') {
          query = query.gte('checked_in_at', monthStart.toISOString())
        }

        const { data: attendance } = await query

        // Count check-ins per member
        const counts: Record<string, { name: string; count: number }> = {}
        ;(attendance || []).forEach((a: any) => {
          const id = a.member_id
          if (!counts[id]) counts[id] = { name: a.members?.name || 'Unknown', count: 0 }
          counts[id].count++
        })

        const sorted = Object.entries(counts)
          .map(([id, data]) => ({ member_id: id, member_name: data.name, check_ins: data.count, rank: 0 }))
          .sort((a, b) => b.check_ins - a.check_ins)

        sorted.forEach((entry, i) => { entry.rank = i + 1 })
        setLeaderboard(sorted)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const medals = ['🥇', '🥈', '🥉']

  if (error) return (
    <div className="p-4 flex flex-col items-center justify-center min-h-[40vh] text-center">
      <p className="text-text-secondary text-sm">Something went wrong</p>
      <button onClick={() => { setError(false); setLoading(true); loadLeaderboard() }} className="text-accent-orange text-sm mt-2 font-medium min-h-[44px]">
        Tap to retry
      </button>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-bold text-text-primary">Leaderboard</h2>

      <div className="flex gap-2">
        {(['month', 'all'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] flex items-center active:opacity-70 ${
              period === p ? 'bg-accent-orange text-white' : 'bg-bg-card text-text-secondary border border-border'
            }`}
          >
            {p === 'month' ? 'This Month' : 'All Time'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-bg-card rounded-xl animate-pulse" />)}</div>
      ) : leaderboard.length === 0 ? (
        <Card className="p-8 text-center">
          <span className="text-3xl">🏆</span>
          <p className="text-text-muted text-sm mt-2">No attendance data yet</p>
        </Card>
      ) : (
        <>
          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-4">
              {/* 2nd place */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-bg-card border-2 border-gray-400 mx-auto flex items-center justify-center text-lg font-bold text-text-primary">
                  {leaderboard[1].member_name.charAt(0)}
                </div>
                <p className="text-[11px] text-text-secondary mt-1 truncate max-w-[70px]">{leaderboard[1].member_name.split(' ')[0]}</p>
                <p className="text-xs font-bold text-gray-400">🥈 {leaderboard[1].check_ins}</p>
              </div>
              {/* 1st place */}
              <div className="text-center -mt-4">
                <div className="w-18 h-18 rounded-full bg-accent-orange/20 border-2 border-accent-orange mx-auto flex items-center justify-center text-xl font-bold text-accent-orange" style={{ width: 72, height: 72 }}>
                  {leaderboard[0].member_name.charAt(0)}
                </div>
                <p className="text-xs text-text-primary mt-1 font-medium truncate max-w-[80px]">{leaderboard[0].member_name.split(' ')[0]}</p>
                <p className="text-sm font-bold text-accent-orange">🥇 {leaderboard[0].check_ins}</p>
              </div>
              {/* 3rd place */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-bg-card border-2 border-amber-700 mx-auto flex items-center justify-center text-lg font-bold text-text-primary">
                  {leaderboard[2].member_name.charAt(0)}
                </div>
                <p className="text-[11px] text-text-secondary mt-1 truncate max-w-[70px]">{leaderboard[2].member_name.split(' ')[0]}</p>
                <p className="text-xs font-bold text-amber-700">🥉 {leaderboard[2].check_ins}</p>
              </div>
            </div>
          )}

          {/* Full List */}
          <div className="space-y-1.5">
            {leaderboard.map(entry => (
              <Card
                key={entry.member_id}
                className={`p-3 flex items-center justify-between ${
                  entry.member_id === currentMemberId ? 'border-accent-orange/50 bg-accent-orange/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 text-center text-sm font-bold">
                    {entry.rank <= 3 ? medals[entry.rank - 1] : <span className="text-text-muted">{entry.rank}</span>}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center text-xs font-bold text-accent-orange">
                    {entry.member_name.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${entry.member_id === currentMemberId ? 'text-accent-orange' : 'text-text-primary'}`}>
                      {entry.member_name} {entry.member_id === currentMemberId && '(You)'}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-text-primary">{entry.check_ins}</p>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
