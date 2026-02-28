import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getHome, toggleDailyLog, getDailyLog } from '@/api/me'
import { todayIST } from '@/utils/helpers'
import { WORKOUT_TEMPLATES, type WorkoutPlan, type WorkoutDay } from '@/utils/constants'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { NoGymCard } from '@/components/shared/NoGymCard'

interface HomeData {
  member: {
    goal: string
  }
}

function isRestDay(day: WorkoutDay): boolean {
  return day.exercises.length === 0
}

function ExerciseTable({ exercises }: { exercises: WorkoutDay['exercises'] }) {
  return (
    <div className="mt-2 space-y-1.5">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px] uppercase tracking-wider text-text-muted font-semibold px-1">
        <span>Exercise</span>
        <span className="w-20 text-center">Sets</span>
        <span className="w-10 text-center">Rest</span>
      </div>
      {/* Rows */}
      {exercises.map((ex, i) => (
        <div
          key={i}
          className={`grid grid-cols-[1fr_auto_auto] gap-2 items-center px-2 py-1.5 rounded-lg text-sm ${
            i % 2 === 0 ? 'bg-white/[0.03]' : ''
          }`}
        >
          <span className="text-text-primary font-medium truncate">{ex.name}</span>
          <span className="w-20 text-center text-accent-primary text-xs font-mono">{ex.sets}</span>
          <span className="w-10 text-center text-text-muted text-xs font-mono">{ex.rest}</span>
        </div>
      ))}
    </div>
  )
}

export default function WorkoutPage() {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [noMatch, setNoMatch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noGym, setNoGym] = useState(false)
  const [workoutDone, setWorkoutDone] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    getDailyLog(todayIST()).then((logs: any[]) => {
      setWorkoutDone(logs.some((l: any) => l.type === 'workout'))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    getHome()
      .then((d) => {
        const data = d as HomeData
        const template = WORKOUT_TEMPLATES[data.member.goal]
        if (template) {
          setPlan(template)
        } else {
          setNoMatch(true)
        }
      })
      .catch((err) => {
        if (err?.response?.data?.code === 'NO_GYM') {
          setNoGym(true)
        } else {
          setError(err?.response?.data?.message || 'Failed to load workout plan')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading your workout plan..." />

  if (noGym) return <NoGymCard feature="workout plans" />

  if (error) {
    return (
      <div className="p-4">
        <Card variant="alert-danger">
          <p className="text-sm">{error}</p>
        </Card>
      </div>
    )
  }

  if (noMatch || !plan) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link to="/m" className="text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-lg font-bold">Workout Plan</h1>
        </div>
        <Card variant="alert-warning">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🏋️</span>
            <div>
              <p className="font-semibold text-sm">No workout plan available</p>
              <p className="text-text-secondary text-sm mt-1">
                Update your goal in{' '}
                <Link to="/m/profile" className="text-accent-primary underline underline-offset-2">
                  Profile
                </Link>{' '}
                to get a personalized workout schedule.
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-2">
        <Link to="/m" className="text-text-secondary hover:text-text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold">Workout Plan</h1>
      </div>

      {/* Plan name banner */}
      <Card variant="gradient">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏋️</span>
          <div>
            <h2 className="text-lg font-bold leading-tight">{plan.name}</h2>
            <p className="text-text-secondary text-xs mt-0.5">
              {plan.schedule.length}-day schedule
            </p>
          </div>
        </div>
      </Card>

      {/* Schedule */}
      <div className="space-y-3">
        {plan.schedule.map((day, idx) => (
          <Card key={idx}>
            {isRestDay(day) ? (
              /* Rest day: compact layout */
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-status-blue/10 flex items-center justify-center">
                  <span className="text-lg">😴</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-text-primary">{day.day}</h3>
                  <p className="text-status-blue text-sm font-medium">{day.label}</p>
                </div>
              </div>
            ) : (
              /* Workout day: full exercise table */
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="text-xs font-mono text-accent-primary bg-accent-primary/10 px-1.5 py-0.5 rounded">
                      {day.day}
                    </span>
                  </div>
                  <span className="text-[11px] text-text-muted">
                    {day.exercises.length} exercises
                  </span>
                </div>
                <h3 className="font-bold text-sm mt-1.5">{day.label}</h3>
                <ExerciseTable exercises={day.exercises} />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Notes */}
      <Card variant="alert-info">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <div>
            <h3 className="font-semibold text-sm mb-1">Notes</h3>
            <p className="text-text-secondary text-sm leading-relaxed">{plan.notes}</p>
          </div>
        </div>
      </Card>

      {/* Disclaimer */}
      <p className="text-text-muted text-[11px] text-center px-4 pb-2">
        This is a general template. Consult a trainer if you have any injuries or medical conditions.
      </p>

      <button
        onClick={async () => {
          setToggling(true)
          try {
            const res = await toggleDailyLog('workout', todayIST())
            setWorkoutDone(res.completed)
          } catch {}
          setToggling(false)
        }}
        disabled={toggling}
        className={`w-full py-3 rounded-2xl font-semibold text-white ${
          workoutDone ? 'bg-status-green' : 'bg-accent-primary'
        }`}
      >
        {workoutDone ? '✓ Done for today' : 'Mark Workout as Done'}
      </button>
    </div>
  )
}
