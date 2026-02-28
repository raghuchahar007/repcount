export interface User {
  _id: string
  phone: string
  role: 'owner' | 'member' | 'admin'
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Gym {
  _id: string
  owner: string
  name: string
  slug: string
  city: string
  address: string | null
  phone: string | null
  description: string | null
  logo_url: string | null
  opening_time: string | null
  closing_time: string | null
  pricing: Record<string, number>
  facilities: string[]
  upi_id: string | null
  created_at: string
}

export interface Badge {
  badge_type: string
  earned_at: string
}

export interface Member {
  _id: string
  user: string | null
  gym: string | Gym
  name: string
  phone: string
  goal: 'weight_loss' | 'muscle_gain' | 'general'
  diet_pref: 'veg' | 'nonveg' | 'egg'
  budget: 'low' | 'medium' | 'high'
  join_date: string
  dob: string | null
  emergency_phone: string | null
  notes: string | null
  is_active: boolean
  badges: Badge[]
  created_at: string
}

export interface Membership {
  _id: string
  member: string
  gym: string
  plan_type: 'monthly' | 'quarterly' | 'half_yearly' | 'yearly'
  amount: number
  start_date: string
  expiry_date: string
  payment_method: 'cash' | 'upi' | 'card' | 'online'
  status: 'active' | 'expired' | 'cancelled'
  paid_at: string
  created_at: string
}

export interface Attendance {
  _id: string
  member: string
  gym: string
  check_in_date: string
  checked_in_at: string
}

export interface GymPost {
  _id: string
  gym: string
  author: string
  title: string
  body: string | null
  post_type: 'challenge' | 'event' | 'offer' | 'announcement'
  image_url: string | null
  starts_at: string | null
  ends_at: string | null
  is_published: boolean
  participants: string[]
  created_at: string
}

export interface Lead {
  _id: string
  gym: string
  name: string
  phone: string
  goal: string | null
  source: 'gym_page' | 'referral' | 'trial' | 'walkin' | 'other'
  referrer: string | null
  status: 'new' | 'contacted' | 'converted' | 'lost'
  notes: string | null
  created_at: string
}

export interface Progress {
  _id: string
  member: string
  metric: string
  value: number
  recorded_at: string
}

export interface MemberWithMembership extends Member {
  latest_membership?: Membership
  membership_status?: 'overdue' | 'expiring_soon' | 'active' | 'no_plan'
  days_overdue?: number
  last_attendance?: string
}
