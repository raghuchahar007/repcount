'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/Card'

interface Meal {
  time: string
  name: string
  nameHi: string
  items: string[]
  calories: number
  protein: number
}

interface DietPlan {
  name: string
  goal: string
  meals: Meal[]
  totalCalories: number
  totalProtein: number
}

// Fallback template-based diet plans
const DIET_TEMPLATES: Record<string, DietPlan> = {
  'veg-weight_loss': {
    name: 'Veg Weight Loss Plan',
    goal: 'weight_loss',
    totalCalories: 1600,
    totalProtein: 75,
    meals: [
      { time: '7:00 AM', name: 'Breakfast', nameHi: 'नाश्ता', items: ['Oats with milk (1 bowl)', 'Banana (1)', 'Green tea'], calories: 350, protein: 12 },
      { time: '10:00 AM', name: 'Snack', nameHi: 'स्नैक', items: ['Sprouts chaat (1 bowl)', 'Nimbu pani'], calories: 150, protein: 8 },
      { time: '1:00 PM', name: 'Lunch', nameHi: 'दोपहर का खाना', items: ['2 Roti (whole wheat)', 'Dal (1 bowl)', 'Sabzi (1 bowl)', 'Salad', 'Curd (1 bowl)'], calories: 500, protein: 20 },
      { time: '4:00 PM', name: 'Evening', nameHi: 'शाम का नाश्ता', items: ['Peanuts (handful)', 'Chai (no sugar)'], calories: 150, protein: 8 },
      { time: '8:00 PM', name: 'Dinner', nameHi: 'रात का खाना', items: ['1 Roti', 'Paneer sabzi (1 bowl)', 'Salad'], calories: 450, protein: 27 },
    ],
  },
  'veg-muscle_gain': {
    name: 'Veg Muscle Gain Plan',
    goal: 'muscle_gain',
    totalCalories: 2400,
    totalProtein: 120,
    meals: [
      { time: '7:00 AM', name: 'Breakfast', nameHi: 'नाश्ता', items: ['Paneer paratha (2)', 'Curd (1 bowl)', 'Banana shake'], calories: 600, protein: 30 },
      { time: '10:00 AM', name: 'Snack', nameHi: 'स्नैक', items: ['Chana (1 bowl)', 'Mixed dry fruits'], calories: 250, protein: 15 },
      { time: '1:00 PM', name: 'Lunch', nameHi: 'दोपहर का खाना', items: ['3 Roti', 'Rajma/Chole (1 bowl)', 'Rice (1 bowl)', 'Salad', 'Lassi'], calories: 700, protein: 30 },
      { time: '4:00 PM', name: 'Pre-workout', nameHi: 'कसरत से पहले', items: ['Banana (2)', 'Peanut butter toast'], calories: 300, protein: 10 },
      { time: '7:00 PM', name: 'Post-workout', nameHi: 'कसरत के बाद', items: ['Soya chunks (1 bowl)', 'Milk'], calories: 200, protein: 20 },
      { time: '9:00 PM', name: 'Dinner', nameHi: 'रात का खाना', items: ['2 Roti', 'Paneer bhurji', 'Dal', 'Salad'], calories: 550, protein: 35 },
    ],
  },
  'veg-general': {
    name: 'Veg Balanced Plan',
    goal: 'general',
    totalCalories: 2000,
    totalProtein: 80,
    meals: [
      { time: '7:30 AM', name: 'Breakfast', nameHi: 'नाश्ता', items: ['Poha/Upma (1 plate)', 'Chai', 'Fruit'], calories: 400, protein: 10 },
      { time: '10:30 AM', name: 'Snack', nameHi: 'स्नैक', items: ['Buttermilk', 'Handful almonds'], calories: 150, protein: 6 },
      { time: '1:00 PM', name: 'Lunch', nameHi: 'दोपहर का खाना', items: ['2 Roti', 'Dal (1 bowl)', 'Sabzi', 'Rice (small)', 'Salad'], calories: 600, protein: 22 },
      { time: '4:30 PM', name: 'Evening', nameHi: 'शाम', items: ['Sprouts/Makhana', 'Green tea'], calories: 150, protein: 8 },
      { time: '8:00 PM', name: 'Dinner', nameHi: 'रात का खाना', items: ['2 Roti', 'Sabzi', 'Curd'], calories: 500, protein: 18 },
    ],
  },
  'nonveg-muscle_gain': {
    name: 'Non-Veg Muscle Gain Plan',
    goal: 'muscle_gain',
    totalCalories: 2600,
    totalProtein: 160,
    meals: [
      { time: '7:00 AM', name: 'Breakfast', nameHi: 'नाश्ता', items: ['Egg bhurji (4 eggs)', '2 Toast', 'Banana'], calories: 500, protein: 30 },
      { time: '10:00 AM', name: 'Snack', nameHi: 'स्नैक', items: ['Boiled eggs (2)', 'Dry fruits'], calories: 250, protein: 18 },
      { time: '1:00 PM', name: 'Lunch', nameHi: 'दोपहर का खाना', items: ['Chicken curry (200g)', '3 Roti', 'Rice', 'Salad'], calories: 750, protein: 45 },
      { time: '4:00 PM', name: 'Pre-workout', nameHi: 'कसरत से पहले', items: ['Banana (2)', 'Peanut butter'], calories: 300, protein: 10 },
      { time: '7:00 PM', name: 'Post-workout', nameHi: 'कसरत के बाद', items: ['Egg whites (4)', 'Milk'], calories: 200, protein: 22 },
      { time: '9:00 PM', name: 'Dinner', nameHi: 'रात का खाना', items: ['Fish/Chicken (150g)', '2 Roti', 'Dal', 'Salad'], calories: 600, protein: 40 },
    ],
  },
  'nonveg-weight_loss': {
    name: 'Non-Veg Weight Loss Plan',
    goal: 'weight_loss',
    totalCalories: 1700,
    totalProtein: 110,
    meals: [
      { time: '7:00 AM', name: 'Breakfast', nameHi: 'नाश्ता', items: ['Egg white omelette (3)', 'Toast (1)', 'Green tea'], calories: 300, protein: 25 },
      { time: '10:00 AM', name: 'Snack', nameHi: 'स्नैक', items: ['Boiled egg (1)', 'Cucumber'], calories: 100, protein: 8 },
      { time: '1:00 PM', name: 'Lunch', nameHi: 'दोपहर का खाना', items: ['Grilled chicken (150g)', '1 Roti', 'Salad (big)'], calories: 450, protein: 35 },
      { time: '4:00 PM', name: 'Evening', nameHi: 'शाम', items: ['Sprouts', 'Green tea'], calories: 100, protein: 8 },
      { time: '8:00 PM', name: 'Dinner', nameHi: 'रात का खाना', items: ['Fish tikka (150g)', 'Salad', 'Dal (small)'], calories: 400, protein: 34 },
    ],
  },
  'egg-muscle_gain': {
    name: 'Eggetarian Muscle Gain Plan',
    goal: 'muscle_gain',
    totalCalories: 2400,
    totalProtein: 130,
    meals: [
      { time: '7:00 AM', name: 'Breakfast', nameHi: 'नाश्ता', items: ['Egg bhurji (4 eggs)', 'Paratha (2)', 'Milk'], calories: 600, protein: 32 },
      { time: '10:00 AM', name: 'Snack', nameHi: 'स्नैक', items: ['Boiled eggs (3)', 'Toast'], calories: 250, protein: 20 },
      { time: '1:00 PM', name: 'Lunch', nameHi: 'दोपहर का खाना', items: ['Egg curry (3 eggs)', '3 Roti', 'Rice', 'Salad'], calories: 700, protein: 30 },
      { time: '4:00 PM', name: 'Pre-workout', nameHi: 'कसरत से पहले', items: ['Banana (2)', 'Peanuts'], calories: 300, protein: 10 },
      { time: '9:00 PM', name: 'Dinner', nameHi: 'रात का खाना', items: ['Paneer (150g)', '2 Roti', 'Dal', 'Egg salad'], calories: 550, protein: 38 },
    ],
  },
}

export default function DietPage() {
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDiet() }, [])

  async function loadDiet() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: member } = await supabase
      .from('members').select('goal, diet_pref').eq('user_id', user.id).eq('is_active', true).single()

    if (member) {
      const key = `${member.diet_pref}-${member.goal}`
      const template = DIET_TEMPLATES[key] || DIET_TEMPLATES['veg-general']
      setPlan(template)
    }
    setLoading(false)
  }

  if (loading) {
    return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-bg-card rounded-2xl animate-pulse" />)}</div>
  }

  if (!plan) {
    return (
      <div className="p-4 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <span className="text-4xl">🥗</span>
        <p className="text-text-muted text-sm mt-2">No diet plan assigned yet</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Your Diet Plan</h2>
        <p className="text-xs text-text-secondary">{plan.name}</p>
      </div>

      {/* Macros Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-accent-orange">{plan.totalCalories}</p>
          <p className="text-[10px] text-text-secondary">Daily Calories</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xl font-bold text-status-blue">{plan.totalProtein}g</p>
          <p className="text-[10px] text-text-secondary">Daily Protein</p>
        </Card>
      </div>

      {/* Meal Cards */}
      <div className="space-y-3">
        {plan.meals.map((meal, i) => (
          <Card key={i} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">{meal.name}</p>
                <p className="text-[10px] text-text-muted">{meal.nameHi} · {meal.time}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-accent-orange">{meal.calories} cal</p>
                <p className="text-[10px] text-status-blue">{meal.protein}g protein</p>
              </div>
            </div>
            <ul className="space-y-1">
              {meal.items.map((item, j) => (
                <li key={j} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-text-muted">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <p className="text-[10px] text-text-muted text-center">
        This is a general plan. Consult your trainer for personalized advice.
      </p>
    </div>
  )
}
