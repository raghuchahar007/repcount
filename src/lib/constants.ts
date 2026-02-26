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
