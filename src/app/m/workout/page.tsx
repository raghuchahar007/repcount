'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'

interface Exercise {
  name: string
  sets: number
  reps: string
  rest: string
}

interface WorkoutDay {
  day: string
  focus: string
  exercises: Exercise[]
}

const WORKOUT_TEMPLATES: Record<string, { name: string; days: WorkoutDay[] }> = {
  'muscle_gain-beginner': {
    name: 'Beginner Muscle Building (PPL)',
    days: [
      {
        day: 'Monday', focus: 'Chest + Triceps',
        exercises: [
          { name: 'Flat Bench Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Cable Flyes', sets: 3, reps: '12-15', rest: '60s' },
          { name: 'Tricep Pushdowns', sets: 3, reps: '12-15', rest: '60s' },
          { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest: '60s' },
        ],
      },
      {
        day: 'Tuesday', focus: 'Back + Biceps',
        exercises: [
          { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Seated Cable Row', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Dumbbell Row', sets: 3, reps: '10-12', rest: '60s' },
          { name: 'Barbell Curl', sets: 3, reps: '10-12', rest: '60s' },
          { name: 'Hammer Curls', sets: 3, reps: '12-15', rest: '60s' },
        ],
      },
      {
        day: 'Wednesday', focus: 'Legs + Shoulders',
        exercises: [
          { name: 'Squats', sets: 4, reps: '8-10', rest: '120s' },
          { name: 'Leg Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Leg Curls', sets: 3, reps: '12-15', rest: '60s' },
          { name: 'Shoulder Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Lateral Raises', sets: 3, reps: '15', rest: '60s' },
          { name: 'Calf Raises', sets: 4, reps: '15-20', rest: '45s' },
        ],
      },
      { day: 'Thursday', focus: 'Rest Day', exercises: [] },
      {
        day: 'Friday', focus: 'Chest + Triceps',
        exercises: [
          { name: 'Incline Bench Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Flat Dumbbell Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Pec Deck / Flyes', sets: 3, reps: '12-15', rest: '60s' },
          { name: 'Close Grip Bench Press', sets: 3, reps: '10-12', rest: '60s' },
          { name: 'Dips', sets: 3, reps: '8-12', rest: '60s' },
        ],
      },
      {
        day: 'Saturday', focus: 'Back + Biceps',
        exercises: [
          { name: 'Deadlift (light)', sets: 3, reps: '8-10', rest: '120s' },
          { name: 'Pull-ups / Assisted', sets: 3, reps: '6-10', rest: '90s' },
          { name: 'T-Bar Row', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Preacher Curls', sets: 3, reps: '10-12', rest: '60s' },
          { name: 'Concentration Curls', sets: 3, reps: '12', rest: '60s' },
        ],
      },
      { day: 'Sunday', focus: 'Rest Day', exercises: [] },
    ],
  },
  'weight_loss-beginner': {
    name: 'Fat Loss Circuit',
    days: [
      {
        day: 'Mon/Wed/Fri', focus: 'Full Body Circuit',
        exercises: [
          { name: 'Jumping Jacks', sets: 3, reps: '30s', rest: '15s' },
          { name: 'Bodyweight Squats', sets: 3, reps: '15', rest: '30s' },
          { name: 'Push-ups', sets: 3, reps: '10-15', rest: '30s' },
          { name: 'Lunges', sets: 3, reps: '12 each', rest: '30s' },
          { name: 'Plank', sets: 3, reps: '30-45s', rest: '30s' },
          { name: 'Mountain Climbers', sets: 3, reps: '20', rest: '30s' },
          { name: 'Treadmill/Cycling', sets: 1, reps: '20 min', rest: '-' },
        ],
      },
      {
        day: 'Tue/Thu', focus: 'Cardio + Core',
        exercises: [
          { name: 'Treadmill Walk (incline)', sets: 1, reps: '30 min', rest: '-' },
          { name: 'Crunches', sets: 3, reps: '20', rest: '30s' },
          { name: 'Leg Raises', sets: 3, reps: '15', rest: '30s' },
          { name: 'Russian Twists', sets: 3, reps: '20', rest: '30s' },
          { name: 'Bicycle Crunches', sets: 3, reps: '20', rest: '30s' },
        ],
      },
      { day: 'Sat/Sun', focus: 'Active Rest', exercises: [] },
    ],
  },
  'general-beginner': {
    name: 'General Fitness Plan',
    days: [
      {
        day: 'Mon/Thu', focus: 'Upper Body',
        exercises: [
          { name: 'Bench Press', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Shoulder Press', sets: 3, reps: '10-12', rest: '60s' },
          { name: 'Bicep Curls', sets: 3, reps: '12', rest: '60s' },
          { name: 'Tricep Pushdowns', sets: 3, reps: '12', rest: '60s' },
        ],
      },
      {
        day: 'Tue/Fri', focus: 'Lower Body + Core',
        exercises: [
          { name: 'Squats', sets: 3, reps: '10-12', rest: '90s' },
          { name: 'Leg Press', sets: 3, reps: '12', rest: '90s' },
          { name: 'Leg Curls', sets: 3, reps: '12', rest: '60s' },
          { name: 'Calf Raises', sets: 3, reps: '15', rest: '45s' },
          { name: 'Plank', sets: 3, reps: '45s', rest: '30s' },
          { name: 'Crunches', sets: 3, reps: '20', rest: '30s' },
        ],
      },
      {
        day: 'Wed', focus: 'Cardio',
        exercises: [
          { name: 'Treadmill/Cycling', sets: 1, reps: '30 min', rest: '-' },
          { name: 'Stretching', sets: 1, reps: '10 min', rest: '-' },
        ],
      },
      { day: 'Sat/Sun', focus: 'Rest', exercises: [] },
    ],
  },
}

export default function WorkoutPage() {
  const [workout, setWorkout] = useState<{ name: string; days: WorkoutDay[] } | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadWorkout() }, [])

  // After workout data loads, auto-select today's day tab
  useEffect(() => {
    if (!workout) return
    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const idx = workout.days.findIndex(d => d.day === dayName)
    if (idx >= 0) setSelectedDay(idx)
  }, [workout])

  async function loadWorkout() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: member } = await supabase
        .from('members').select('goal').eq('user_id', user.id).eq('is_active', true).single()

      if (member) {
        const key = `${member.goal}-beginner`
        setWorkout(WORKOUT_TEMPLATES[key] || WORKOUT_TEMPLATES['general-beginner'])
      }
    } catch {
      // silently handle - page shows empty/fallback state
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-4 space-y-4">{[1, 2].map(i => <div key={i} className="h-32 bg-bg-card rounded-2xl animate-pulse" />)}</div>
  if (!workout) return (
    <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
      <span className="text-5xl mb-4">💪</span>
      <p className="text-text-muted">No workout plan assigned yet</p>
    </div>
  )

  const day = workout.days[selectedDay]

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Workout Plan</h2>
        <p className="text-xs text-text-secondary">{workout.name}</p>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {workout.days.map((d, i) => (
          <button
            key={i}
            onClick={() => setSelectedDay(i)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
              selectedDay === i
                ? 'bg-accent-orange text-white'
                : 'bg-bg-card text-text-secondary border border-border'
            }`}
          >
            {d.day}
          </button>
        ))}
      </div>

      {/* Selected Day */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">{day.exercises.length > 0 ? '💪' : '😴'}</span>
          <div>
            <p className="text-sm font-semibold text-text-primary">{day.focus}</p>
            <p className="text-[10px] text-text-muted">
              {day.exercises.length > 0 ? `${day.exercises.length} exercises` : 'Recovery and rest'}
            </p>
          </div>
        </div>

        {day.exercises.length > 0 ? (
          <div className="space-y-3">
            {day.exercises.map((ex, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-bg-hover flex items-center justify-center text-[10px] font-bold text-accent-orange">
                    {i + 1}
                  </span>
                  <p className="text-sm text-text-primary">{ex.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-secondary">{ex.sets} × {ex.reps}</p>
                  <p className="text-[10px] text-text-muted">Rest: {ex.rest}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="text-3xl">🧘</span>
            <p className="text-sm text-text-secondary mt-2">Take rest, stay hydrated, eat well</p>
          </div>
        )}
      </Card>
    </div>
  )
}
