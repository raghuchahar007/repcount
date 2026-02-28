export const GOALS = [
  { value: 'weight_loss', label: 'Weight Loss', labelHi: 'वजन घटाना', emoji: '🏃' },
  { value: 'muscle_gain', label: 'Muscle Gain', labelHi: 'मसल्स बनाना', emoji: '💪' },
  { value: 'general', label: 'General Fitness', labelHi: 'सामान्य फिटनेस', emoji: '🏋️' },
] as const

export const DIET_PREFS = [
  { value: 'veg', label: 'Vegetarian', labelHi: 'शाकाहारी', emoji: '🥗' },
  { value: 'nonveg', label: 'Non-Veg', labelHi: 'मांसाहारी', emoji: '🍗' },
  { value: 'egg', label: 'Eggetarian', labelHi: 'अंडा शाकाहारी', emoji: '🥚' },
] as const

export const PLAN_TYPES = [
  { value: 'monthly', label: '1 Month', months: 1 },
  { value: 'quarterly', label: '3 Months', months: 3 },
  { value: 'half_yearly', label: '6 Months', months: 6 },
  { value: 'yearly', label: '12 Months', months: 12 },
] as const

export const BADGE_TYPES = [
  { type: 'first_week', label: 'First Week Done', emoji: '🌟', requirement: '7 day streak' },
  { type: '30_day_streak', label: '30-Day Warrior', emoji: '🔥', requirement: '30 day streak' },
  { type: '100_day_club', label: '100 Day Club', emoji: '💯', requirement: '100 day streak' },
  { type: 'never_missed_monday', label: 'Never Missed Monday', emoji: '📅', requirement: '4 consecutive Mondays' },
  { type: 'referral_1', label: 'First Referral', emoji: '🤝', requirement: 'Referred 1 friend' },
  { type: 'referral_3', label: 'Influencer', emoji: '📣', requirement: 'Referred 3 friends' },
  { type: 'top_10', label: 'Leaderboard Legend', emoji: '🏅', requirement: 'Top 10 in monthly attendance' },
] as const

export const POST_TYPES = [
  { value: 'challenge', label: 'Challenge', emoji: '🏆', color: 'text-accent-orange bg-accent-orange/10' },
  { value: 'event', label: 'Event', emoji: '🎉', color: 'text-status-blue bg-status-blue/10' },
  { value: 'offer', label: 'Offer', emoji: '🎁', color: 'text-status-green bg-status-green/10' },
  { value: 'announcement', label: 'Announcement', emoji: '📢', color: 'text-status-purple bg-status-purple/10' },
] as const

export const FACILITIES_OPTIONS = [
  '💪 Free Weights', '🏃 Cardio Zone', '❄️ AC', '🚿 Shower',
  '🅿️ Parking', '🥤 Supplement Shop', '👨‍🏫 Personal Trainer',
  '🪞 Mirror Wall', '🎵 Music System', '🧘 Yoga Area',
  '🥊 Boxing Ring', '👩 Ladies Section',
] as const

// ---------------------------------------------------------------------------
// Diet & Workout Template Interfaces
// ---------------------------------------------------------------------------

export interface MealPlan {
  name: string
  meals: { time: string; label: string; items: string[] }[]
  notes: string
}

export interface WorkoutDay {
  day: string
  label: string
  exercises: { name: string; sets: string; rest: string }[]
}

export interface WorkoutPlan {
  name: string
  schedule: WorkoutDay[]
  notes: string
}

// ---------------------------------------------------------------------------
// Diet Templates — 9 plans (3 goals x 3 diet preferences)
// ---------------------------------------------------------------------------

export const DIET_TEMPLATES: Record<string, MealPlan> = {
  // ── Muscle Gain ──────────────────────────────────────────────────────────
  muscle_gain_veg: {
    name: 'Muscle Gain — Vegetarian',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '1 glass milk + 1 scoop whey protein',
          '4 whole-wheat toast with peanut butter',
          '1 banana',
        ],
      },
      {
        time: '10:00 AM',
        label: 'Mid-Morning Snack',
        items: ['Handful of almonds & walnuts (30g)', '1 glass buttermilk'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '2 roti + 1 bowl rice',
          '1 bowl rajma or chole',
          '1 bowl paneer bhurji (150g paneer)',
          'Salad + curd',
        ],
      },
      {
        time: '4:00 PM',
        label: 'Pre-Workout',
        items: ['1 banana + 1 tbsp honey', '1 glass milk'],
      },
      {
        time: '7:00 PM',
        label: 'Post-Workout',
        items: ['1 scoop whey protein shake with milk', '2 idli or 1 sweet potato'],
      },
      {
        time: '9:00 PM',
        label: 'Dinner',
        items: [
          '2 roti',
          '1 bowl dal (moong/masoor)',
          '1 bowl soya chunk sabzi',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~2,800 kcal, ~130g protein. Increase paneer/soya portions if still hungry. Drink 3-4L water daily.',
  },

  muscle_gain_nonveg: {
    name: 'Muscle Gain — Non-Veg',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '4 egg-white omelette + 2 whole eggs',
          '2 paratha with butter',
          '1 glass milk',
        ],
      },
      {
        time: '10:00 AM',
        label: 'Mid-Morning Snack',
        items: ['Chicken sandwich (100g chicken breast)', '1 fruit (apple/banana)'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '1 bowl rice + 1 roti',
          '1 bowl chicken curry (200g chicken)',
          '1 bowl dal',
          'Salad + raita',
        ],
      },
      {
        time: '4:00 PM',
        label: 'Pre-Workout',
        items: ['1 banana + handful of dry fruits', '1 glass milk or black coffee'],
      },
      {
        time: '7:00 PM',
        label: 'Post-Workout',
        items: ['1 scoop whey protein shake', '2 boiled eggs', '1 roti or sweet potato'],
      },
      {
        time: '9:00 PM',
        label: 'Dinner',
        items: [
          '2 roti',
          '1 bowl fish curry or grilled chicken (150g)',
          '1 bowl mixed veg',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~3,000 kcal, ~160g protein. Prioritize chicken breast and fish for lean protein. Drink 3-4L water daily.',
  },

  muscle_gain_egg: {
    name: 'Muscle Gain — Eggetarian',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '4 egg-white omelette + 2 whole eggs with veggies',
          '3 whole-wheat toast',
          '1 glass milk',
        ],
      },
      {
        time: '10:00 AM',
        label: 'Mid-Morning Snack',
        items: ['2 boiled eggs', '1 banana', 'Handful of almonds'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '2 roti + 1 bowl rice',
          '1 bowl egg curry (3 eggs)',
          '1 bowl paneer sabzi (100g paneer)',
          'Salad + curd',
        ],
      },
      {
        time: '4:00 PM',
        label: 'Pre-Workout',
        items: ['1 banana + 1 tbsp peanut butter', '1 glass milk'],
      },
      {
        time: '7:00 PM',
        label: 'Post-Workout',
        items: ['1 scoop whey protein shake with milk', '2 boiled eggs', '1 sweet potato'],
      },
      {
        time: '9:00 PM',
        label: 'Dinner',
        items: [
          '2 roti',
          '1 bowl dal (toor/masoor)',
          'Egg bhurji (3 eggs)',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~2,900 kcal, ~145g protein. Eggs are your primary protein — aim for 8-10 per day. Drink 3-4L water daily.',
  },

  // ── Weight Loss ──────────────────────────────────────────────────────────
  weight_loss_veg: {
    name: 'Weight Loss — Vegetarian',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '1 bowl poha or upma (small portion)',
          '1 glass green tea',
          '5 soaked almonds',
        ],
      },
      {
        time: '10:00 AM',
        label: 'Mid-Morning Snack',
        items: ['1 fruit (apple/guava/papaya)', '1 glass buttermilk'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '1 roti (no ghee)',
          '1 small bowl rice',
          '1 bowl dal',
          '1 bowl sabzi (lauki/tori/palak paneer with less oil)',
          'Large salad',
        ],
      },
      {
        time: '4:00 PM',
        label: 'Evening Snack',
        items: ['1 cup green tea', 'Handful of roasted chana or makhana'],
      },
      {
        time: '7:30 PM',
        label: 'Dinner',
        items: [
          '1 roti or 1 bowl daliya (broken wheat)',
          '1 bowl mixed veg (less oil)',
          '1 bowl curd',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~1,600 kcal, ~60g protein. Avoid fried foods, sweets, and sugary drinks. Walk 30 min daily in addition to gym.',
  },

  weight_loss_nonveg: {
    name: 'Weight Loss — Non-Veg',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '3 egg-white omelette with veggies',
          '1 whole-wheat toast',
          '1 glass green tea',
        ],
      },
      {
        time: '10:00 AM',
        label: 'Mid-Morning Snack',
        items: ['1 fruit (apple/guava)', '5 almonds'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '1 small bowl rice or 1 roti',
          'Grilled chicken breast (150g) or fish tikka',
          '1 bowl dal',
          'Large salad + raita',
        ],
      },
      {
        time: '4:00 PM',
        label: 'Evening Snack',
        items: ['1 cup green tea', '1 boiled egg'],
      },
      {
        time: '7:30 PM',
        label: 'Dinner',
        items: [
          'Chicken soup or grilled fish (100g)',
          '1 roti (no ghee)',
          '1 bowl steamed veggies',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~1,500 kcal, ~100g protein. Avoid tandoori with cream, fried chicken, and biryani. Prefer grilled/baked. Walk 30 min daily.',
  },

  weight_loss_egg: {
    name: 'Weight Loss — Eggetarian',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '3 egg-white omelette + 1 whole egg',
          '1 whole-wheat toast',
          '1 glass green tea',
        ],
      },
      {
        time: '10:00 AM',
        label: 'Mid-Morning Snack',
        items: ['1 fruit (papaya/guava)', '1 glass buttermilk'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '1 roti + small bowl rice',
          '1 bowl dal',
          '1 bowl sabzi (less oil)',
          '1 boiled egg',
          'Large salad',
        ],
      },
      {
        time: '4:00 PM',
        label: 'Evening Snack',
        items: ['1 cup green tea', 'Handful of roasted makhana'],
      },
      {
        time: '7:30 PM',
        label: 'Dinner',
        items: [
          'Egg bhurji (2 eggs, less oil)',
          '1 roti',
          '1 bowl mixed veg',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~1,550 kcal, ~80g protein. Limit whole eggs to 4/day for calorie control. Avoid fried foods and sweets. Walk 30 min daily.',
  },

  // ── General Fitness ──────────────────────────────────────────────────────
  general_veg: {
    name: 'General Fitness — Vegetarian',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '2 paratha with curd or 1 bowl oats with milk',
          '1 banana',
          '1 glass milk or chai',
        ],
      },
      {
        time: '10:30 AM',
        label: 'Mid-Morning Snack',
        items: ['1 fruit + handful of dry fruits', '1 glass buttermilk'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '2 roti + 1 bowl rice',
          '1 bowl dal',
          '1 bowl paneer/soya sabzi',
          'Salad + curd',
        ],
      },
      {
        time: '4:30 PM',
        label: 'Evening Snack',
        items: ['Chai + 2 biscuits or makhana', '1 fruit'],
      },
      {
        time: '8:00 PM',
        label: 'Dinner',
        items: [
          '2 roti',
          '1 bowl sabzi',
          '1 bowl dal or curd',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~2,200 kcal, ~70g protein. Balanced diet for active lifestyle. Include seasonal fruits. Drink 3L water daily.',
  },

  general_nonveg: {
    name: 'General Fitness — Non-Veg',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '2 eggs (any style) + 2 toast',
          '1 glass milk or chai',
          '1 fruit',
        ],
      },
      {
        time: '10:30 AM',
        label: 'Mid-Morning Snack',
        items: ['Handful of dry fruits', '1 glass buttermilk or lassi'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '2 roti + 1 bowl rice',
          '1 bowl chicken curry or fish (150g)',
          '1 bowl dal',
          'Salad + raita',
        ],
      },
      {
        time: '4:30 PM',
        label: 'Evening Snack',
        items: ['Chai + 2 biscuits', '1 boiled egg or fruit'],
      },
      {
        time: '8:00 PM',
        label: 'Dinner',
        items: [
          '2 roti',
          '1 bowl egg curry or keema (100g)',
          '1 bowl sabzi',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~2,400 kcal, ~100g protein. Balanced diet with moderate portions. Avoid deep-fried items. Drink 3L water daily.',
  },

  general_egg: {
    name: 'General Fitness — Eggetarian',
    meals: [
      {
        time: '7:00 AM',
        label: 'Breakfast',
        items: [
          '2 egg omelette + 2 paratha',
          '1 glass milk or chai',
          '1 banana',
        ],
      },
      {
        time: '10:30 AM',
        label: 'Mid-Morning Snack',
        items: ['1 fruit + handful of almonds', '1 glass buttermilk'],
      },
      {
        time: '1:00 PM',
        label: 'Lunch',
        items: [
          '2 roti + 1 bowl rice',
          '1 bowl egg curry (2 eggs)',
          '1 bowl dal or paneer sabzi',
          'Salad + curd',
        ],
      },
      {
        time: '4:30 PM',
        label: 'Evening Snack',
        items: ['Chai + roasted chana or makhana', '1 boiled egg'],
      },
      {
        time: '8:00 PM',
        label: 'Dinner',
        items: [
          '2 roti',
          '1 bowl sabzi',
          'Egg bhurji (2 eggs)',
          'Salad',
        ],
      },
    ],
    notes: 'Target ~2,300 kcal, ~90g protein. Good balance of eggs and dairy for protein. Include seasonal fruits. Drink 3L water daily.',
  },
}

// ---------------------------------------------------------------------------
// Workout Templates — 3 plans (one per goal)
// ---------------------------------------------------------------------------

export const WORKOUT_TEMPLATES: Record<string, WorkoutPlan> = {
  muscle_gain: {
    name: 'Push-Pull-Legs Split (6 Days)',
    schedule: [
      {
        day: 'Monday',
        label: 'Push (Chest, Shoulders, Triceps)',
        exercises: [
          { name: 'Flat Bench Press', sets: '4 × 8-10', rest: '90s' },
          { name: 'Incline Dumbbell Press', sets: '3 × 10-12', rest: '75s' },
          { name: 'Overhead Press (Barbell)', sets: '4 × 8-10', rest: '90s' },
          { name: 'Lateral Raises', sets: '3 × 12-15', rest: '60s' },
          { name: 'Tricep Rope Pushdown', sets: '3 × 12-15', rest: '60s' },
          { name: 'Overhead Tricep Extension', sets: '3 × 10-12', rest: '60s' },
        ],
      },
      {
        day: 'Tuesday',
        label: 'Pull (Back, Biceps)',
        exercises: [
          { name: 'Deadlift', sets: '4 × 6-8', rest: '120s' },
          { name: 'Lat Pulldown', sets: '4 × 8-10', rest: '75s' },
          { name: 'Seated Cable Row', sets: '3 × 10-12', rest: '75s' },
          { name: 'Face Pulls', sets: '3 × 15-20', rest: '60s' },
          { name: 'Barbell Bicep Curl', sets: '3 × 10-12', rest: '60s' },
          { name: 'Hammer Curl', sets: '3 × 10-12', rest: '60s' },
        ],
      },
      {
        day: 'Wednesday',
        label: 'Legs (Quads, Hamstrings, Calves)',
        exercises: [
          { name: 'Barbell Squat', sets: '4 × 8-10', rest: '120s' },
          { name: 'Leg Press', sets: '4 × 10-12', rest: '90s' },
          { name: 'Romanian Deadlift', sets: '3 × 10-12', rest: '90s' },
          { name: 'Leg Curl', sets: '3 × 12-15', rest: '60s' },
          { name: 'Leg Extension', sets: '3 × 12-15', rest: '60s' },
          { name: 'Standing Calf Raise', sets: '4 × 15-20', rest: '60s' },
        ],
      },
      {
        day: 'Thursday',
        label: 'Push (Chest, Shoulders, Triceps)',
        exercises: [
          { name: 'Incline Barbell Press', sets: '4 × 8-10', rest: '90s' },
          { name: 'Dumbbell Flyes', sets: '3 × 10-12', rest: '60s' },
          { name: 'Dumbbell Shoulder Press', sets: '4 × 8-10', rest: '90s' },
          { name: 'Cable Lateral Raises', sets: '3 × 12-15', rest: '60s' },
          { name: 'Dips (Tricep focus)', sets: '3 × 10-12', rest: '75s' },
          { name: 'Skull Crushers', sets: '3 × 10-12', rest: '60s' },
        ],
      },
      {
        day: 'Friday',
        label: 'Pull (Back, Biceps)',
        exercises: [
          { name: 'Barbell Row', sets: '4 × 8-10', rest: '90s' },
          { name: 'Pull-Ups / Assisted Pull-Ups', sets: '3 × 8-10', rest: '90s' },
          { name: 'Single-Arm Dumbbell Row', sets: '3 × 10-12', rest: '75s' },
          { name: 'Rear Delt Flyes', sets: '3 × 12-15', rest: '60s' },
          { name: 'Incline Dumbbell Curl', sets: '3 × 10-12', rest: '60s' },
          { name: 'Concentration Curl', sets: '3 × 10-12', rest: '60s' },
        ],
      },
      {
        day: 'Saturday',
        label: 'Legs (Quads, Hamstrings, Glutes)',
        exercises: [
          { name: 'Front Squat', sets: '4 × 8-10', rest: '120s' },
          { name: 'Bulgarian Split Squat', sets: '3 × 10-12 each leg', rest: '75s' },
          { name: 'Stiff-Leg Deadlift', sets: '3 × 10-12', rest: '90s' },
          { name: 'Hip Thrust', sets: '3 × 12-15', rest: '75s' },
          { name: 'Leg Extension', sets: '3 × 12-15', rest: '60s' },
          { name: 'Seated Calf Raise', sets: '4 × 15-20', rest: '60s' },
        ],
      },
      {
        day: 'Sunday',
        label: 'Rest Day',
        exercises: [],
      },
    ],
    notes: 'Progressive overload: increase weight by 2.5 kg when you complete all reps in every set. Rest 1-2 min between heavy compounds. Warm up with 5 min cardio + dynamic stretching.',
  },

  weight_loss: {
    name: 'Full Body + HIIT (Alternating, 6 Days)',
    schedule: [
      {
        day: 'Monday',
        label: 'Full Body Strength',
        exercises: [
          { name: 'Goblet Squat', sets: '3 × 12-15', rest: '60s' },
          { name: 'Dumbbell Bench Press', sets: '3 × 12-15', rest: '60s' },
          { name: 'Lat Pulldown', sets: '3 × 12-15', rest: '60s' },
          { name: 'Dumbbell Shoulder Press', sets: '3 × 12-15', rest: '60s' },
          { name: 'Plank', sets: '3 × 45s hold', rest: '30s' },
          { name: 'Treadmill Walk (incline 10%)', sets: '1 × 15 min', rest: '—' },
        ],
      },
      {
        day: 'Tuesday',
        label: 'HIIT + Cardio',
        exercises: [
          { name: 'Jumping Jacks', sets: '3 × 45s', rest: '15s' },
          { name: 'Burpees', sets: '3 × 30s', rest: '30s' },
          { name: 'Mountain Climbers', sets: '3 × 30s', rest: '15s' },
          { name: 'High Knees', sets: '3 × 30s', rest: '15s' },
          { name: 'Jump Squats', sets: '3 × 30s', rest: '30s' },
          { name: 'Cycling / Treadmill Jog', sets: '1 × 20 min', rest: '—' },
        ],
      },
      {
        day: 'Wednesday',
        label: 'Full Body Strength',
        exercises: [
          { name: 'Leg Press', sets: '3 × 12-15', rest: '60s' },
          { name: 'Push-Ups', sets: '3 × 15-20', rest: '45s' },
          { name: 'Seated Cable Row', sets: '3 × 12-15', rest: '60s' },
          { name: 'Lateral Raises', sets: '3 × 15', rest: '45s' },
          { name: 'Russian Twist', sets: '3 × 20', rest: '30s' },
          { name: 'Elliptical / Cross Trainer', sets: '1 × 15 min', rest: '—' },
        ],
      },
      {
        day: 'Thursday',
        label: 'HIIT + Cardio',
        exercises: [
          { name: 'Skipping Rope', sets: '3 × 1 min', rest: '30s' },
          { name: 'Squat Jumps', sets: '3 × 30s', rest: '30s' },
          { name: 'Plank to Push-Up', sets: '3 × 30s', rest: '30s' },
          { name: 'Lunges (alternating)', sets: '3 × 30s', rest: '15s' },
          { name: 'Box Step-Ups', sets: '3 × 30s', rest: '15s' },
          { name: 'Treadmill Jog', sets: '1 × 20 min', rest: '—' },
        ],
      },
      {
        day: 'Friday',
        label: 'Full Body Strength',
        exercises: [
          { name: 'Dumbbell Lunges', sets: '3 × 12 each leg', rest: '60s' },
          { name: 'Incline Dumbbell Press', sets: '3 × 12-15', rest: '60s' },
          { name: 'Cable Face Pull', sets: '3 × 15', rest: '45s' },
          { name: 'Dumbbell Curl', sets: '3 × 12-15', rest: '45s' },
          { name: 'Leg Raises', sets: '3 × 15', rest: '30s' },
          { name: 'Cycling', sets: '1 × 15 min', rest: '—' },
        ],
      },
      {
        day: 'Saturday',
        label: 'HIIT + Cardio',
        exercises: [
          { name: 'Burpees', sets: '4 × 30s', rest: '30s' },
          { name: 'Kettlebell Swings', sets: '3 × 15', rest: '30s' },
          { name: 'Battle Ropes', sets: '3 × 30s', rest: '30s' },
          { name: 'Thrusters (Dumbbell)', sets: '3 × 12', rest: '45s' },
          { name: 'Treadmill Sprint Intervals', sets: '8 × 30s sprint / 30s walk', rest: '—' },
        ],
      },
      {
        day: 'Sunday',
        label: 'Rest / Light Walk',
        exercises: [],
      },
    ],
    notes: 'Keep heart rate in fat-burning zone (130-150 BPM) during HIIT. Use lighter weights with higher reps for strength days. Drink water throughout. Pair with calorie-deficit diet.',
  },

  general: {
    name: 'Full Body 3-Day (Beginner Friendly)',
    schedule: [
      {
        day: 'Monday',
        label: 'Full Body A',
        exercises: [
          { name: 'Barbell Squat', sets: '3 × 10-12', rest: '90s' },
          { name: 'Flat Bench Press', sets: '3 × 10-12', rest: '90s' },
          { name: 'Lat Pulldown', sets: '3 × 10-12', rest: '75s' },
          { name: 'Dumbbell Shoulder Press', sets: '3 × 10-12', rest: '75s' },
          { name: 'Plank', sets: '3 × 30s hold', rest: '30s' },
        ],
      },
      {
        day: 'Tuesday',
        label: 'Rest / Light Cardio',
        exercises: [],
      },
      {
        day: 'Wednesday',
        label: 'Full Body B',
        exercises: [
          { name: 'Leg Press', sets: '3 × 10-12', rest: '90s' },
          { name: 'Incline Dumbbell Press', sets: '3 × 10-12', rest: '75s' },
          { name: 'Seated Cable Row', sets: '3 × 10-12', rest: '75s' },
          { name: 'Lateral Raises', sets: '3 × 12-15', rest: '60s' },
          { name: 'Bicep Curl', sets: '3 × 12', rest: '60s' },
          { name: 'Tricep Pushdown', sets: '3 × 12', rest: '60s' },
        ],
      },
      {
        day: 'Thursday',
        label: 'Rest / Light Cardio',
        exercises: [],
      },
      {
        day: 'Friday',
        label: 'Full Body C',
        exercises: [
          { name: 'Dumbbell Lunges', sets: '3 × 10 each leg', rest: '75s' },
          { name: 'Push-Ups', sets: '3 × 12-15', rest: '60s' },
          { name: 'Dumbbell Row', sets: '3 × 10-12', rest: '75s' },
          { name: 'Dumbbell Shoulder Press', sets: '3 × 10-12', rest: '75s' },
          { name: 'Leg Raises', sets: '3 × 12', rest: '30s' },
          { name: 'Crunches', sets: '3 × 15', rest: '30s' },
        ],
      },
      {
        day: 'Saturday',
        label: 'Rest',
        exercises: [],
      },
      {
        day: 'Sunday',
        label: 'Rest',
        exercises: [],
      },
    ],
    notes: 'Perfect for beginners: 3 days on, rest days in between. Focus on form first, then increase weight gradually. Warm up 5 min on treadmill before each session. Cool down with stretching.',
  },
}
