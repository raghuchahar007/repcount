import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getHome } from '@/api/me'
import { DIET_TEMPLATES, type MealPlan } from '@/utils/constants'
import { Card } from '@/components/ui/Card'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { NoGymCard } from '@/components/shared/NoGymCard'

interface HomeData {
  member: {
    goal: string
    diet_pref: string
  }
}

export default function DietPage() {
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const [noMatch, setNoMatch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noGym, setNoGym] = useState(false)

  useEffect(() => {
    getHome()
      .then((d) => {
        const data = d as HomeData
        const key = `${data.member.goal}_${data.member.diet_pref}`
        const template = DIET_TEMPLATES[key]
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
          setError(err?.response?.data?.message || 'Failed to load diet plan')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading your diet plan..." />

  if (noGym) return <NoGymCard feature="diet plans" />

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
          <h1 className="text-lg font-bold">Diet Plan</h1>
        </div>
        <Card variant="alert-warning">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">🍽️</span>
            <div>
              <p className="font-semibold text-sm">No diet plan available</p>
              <p className="text-text-secondary text-sm mt-1">
                Update your goal and diet preference in{' '}
                <Link to="/m/profile" className="text-accent-orange underline underline-offset-2">
                  Profile
                </Link>{' '}
                to get a personalized meal plan.
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
        <h1 className="text-lg font-bold">Diet Plan</h1>
      </div>

      {/* Plan name banner */}
      <Card variant="gradient">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🍽️</span>
          <div>
            <h2 className="text-lg font-bold leading-tight">{plan.name}</h2>
            <p className="text-text-secondary text-xs mt-0.5">Personalized for your goals</p>
          </div>
        </div>
      </Card>

      {/* Meals */}
      <div className="space-y-3">
        {plan.meals.map((meal, idx) => (
          <Card key={idx}>
            <div className="flex items-start gap-3">
              {/* Time column */}
              <div className="shrink-0 w-16 pt-0.5">
                <span className="text-xs font-mono text-accent-orange bg-accent-orange/10 px-1.5 py-0.5 rounded">
                  {meal.time}
                </span>
              </div>

              {/* Meal details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm">{meal.label}</h3>
                <ul className="mt-1.5 space-y-1">
                  {meal.items.map((item, i) => (
                    <li key={i} className="text-text-secondary text-sm flex items-start gap-2">
                      <span className="text-accent-orange/60 mt-1.5 shrink-0 block w-1 h-1 rounded-full bg-accent-orange/60" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
        This is a general template. Consult a nutritionist for a plan tailored to your specific needs.
      </p>
    </div>
  )
}
