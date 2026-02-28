import { useState, useEffect } from 'react'
import { getLeaderboard } from '@/api/me'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { NoGymCard } from '@/components/shared/NoGymCard'

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
          ? 'border-accent-primary bg-accent-primary/10'
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
        <span className="text-[10px] font-semibold text-accent-primary mt-0.5">YOU</span>
      )}
    </div>
  )
}

function ListRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
        entry.isMe
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-border bg-bg-card'
      }`}
    >
      <span className="text-text-muted font-bold text-sm w-6 text-center">
        #{entry.rank}
      </span>
      <span className="flex-1 font-medium text-sm truncate">
        {entry.name}
        {entry.isMe && (
          <span className="text-accent-primary text-xs ml-1.5 font-semibold">(You)</span>
        )}
      </span>
      <span className="text-text-secondary text-sm font-semibold">
        {entry.count} {entry.count === 1 ? 'day' : 'days'}
      </span>
    </div>
  )
}

const PERIOD_TABS: { value: 'week' | 'month' | 'all'; label: string }[] = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
]

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noGym, setNoGym] = useState(false)
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    setLoading(true)
    setError('')
    getLeaderboard(period)
      .then((d) => setEntries((d.leaderboard || d) as LeaderboardEntry[]))
      .catch((err) => {
        if (err?.response?.data?.code === 'NO_GYM') {
          setNoGym(true)
        } else {
          setError(err?.response?.data?.message || 'Failed to load leaderboard')
        }
      })
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <LoadingSpinner text="Loading leaderboard..." />

  if (noGym) return <NoGymCard feature="the leaderboard" />

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
        <p className="text-text-secondary text-sm mt-1">Top 10</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 justify-center">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setPeriod(tab.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              period === tab.value
                ? 'bg-accent-primary text-white'
                : 'bg-bg-card border border-border-light text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <span className="text-4xl block mb-3">🏋️</span>
            <p className="text-text-secondary text-sm">
              No check-ins {period === 'week' ? 'this week' : period === 'all' ? '' : 'this month'} yet
            </p>
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
