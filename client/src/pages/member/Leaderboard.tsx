import { useState, useEffect } from 'react'
import { getLeaderboard } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface LeaderboardEntry {
  rank: number
  name: string
  count: number
  isMe: boolean
}

const MEDAL_STYLES: Record<number, { emoji: string; color: string; textSize: string }> = {
  1: { emoji: '🥇', color: '#fbbf24', textSize: 'text-2xl' },
  2: { emoji: '🥈', color: '#9ca3af', textSize: 'text-xl' },
  3: { emoji: '🥉', color: '#cd7f32', textSize: 'text-lg' },
}

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const style = MEDAL_STYLES[entry.rank]
  const isFirst = entry.rank === 1

  return (
    <div
      className={`flex flex-col items-center gap-1 flex-1 rounded-2xl p-3 border transition-colors ${
        entry.isMe
          ? 'border-accent-orange bg-accent-orange/10'
          : 'border-border bg-bg-card'
      }`}
    >
      <span className={isFirst ? 'text-4xl' : 'text-3xl'}>{style.emoji}</span>
      <span
        className={`font-bold ${style.textSize}`}
        style={{ color: style.color }}
      >
        {entry.count}
      </span>
      <span className="text-text-secondary text-xs text-center leading-tight truncate w-full">
        {entry.name}
      </span>
      {entry.isMe && (
        <span className="text-[10px] font-semibold text-accent-orange mt-0.5">YOU</span>
      )}
    </div>
  )
}

function ListRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        entry.isMe
          ? 'border-accent-orange bg-accent-orange/10'
          : 'border-border bg-bg-card'
      }`}
    >
      <span className="text-text-muted font-bold text-sm w-6 text-center">
        #{entry.rank}
      </span>
      <span className="flex-1 font-medium text-sm truncate">
        {entry.name}
        {entry.isMe && (
          <span className="text-accent-orange text-xs ml-1.5 font-semibold">(You)</span>
        )}
      </span>
      <span className="text-text-secondary text-sm font-semibold">
        {entry.count} {entry.count === 1 ? 'day' : 'days'}
      </span>
    </div>
  )
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getLeaderboard()
      .then((d) => setEntries(d as LeaderboardEntry[]))
      .catch((err) => setError(err?.response?.data?.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading leaderboard..." />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  const top3 = entries.filter((e) => e.rank <= 3)
  const rest = entries.filter((e) => e.rank > 3)
  const userInList = entries.some((e) => e.isMe)

  return (
    <div className="p-4 space-y-5">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-2xl font-bold">
          Leaderboard <span className="inline-block">🏆</span>
        </h1>
        <p className="text-text-secondary text-sm mt-1">Top 10 &middot; This Month</p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <span className="text-4xl block mb-3">🏋️</span>
            <p className="text-text-secondary text-sm">No check-ins this month yet</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Podium — top 3 */}
          {top3.length > 0 && (
            <div className="flex gap-2 items-end">
              {/* Render in visual order: 2nd, 1st, 3rd */}
              {[2, 1, 3].map((rank) => {
                const entry = top3.find((e) => e.rank === rank)
                if (!entry) return <div key={rank} className="flex-1" />
                return (
                  <div
                    key={rank}
                    className={rank === 1 ? 'flex-1 -mt-2' : 'flex-1 mt-2'}
                  >
                    <PodiumCard entry={entry} />
                  </div>
                )
              })}
            </div>
          )}

          {/* Ranks 4-10 */}
          {rest.length > 0 && (
            <div className="space-y-2">
              {rest.map((entry) => (
                <ListRow key={entry.rank} entry={entry} />
              ))}
            </div>
          )}

          {/* Not in top 10 note */}
          {!userInList && (
            <p className="text-center text-text-muted text-sm pt-2">
              Keep checking in to make the leaderboard!
            </p>
          )}
        </>
      )}
    </div>
  )
}
