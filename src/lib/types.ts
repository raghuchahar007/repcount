// Database types for RepCount

export interface Profile {
  id: string
  phone: string
  full_name: string | null
  role: 'owner' | 'member' | 'admin'
  avatar_url: string | null
  created_at: string
}

export interface Gym {
  id: string
  owner_id: string
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

export interface Member {
  id: string
  user_id: string | null
  gym_id: string
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
  created_at: string
}

export interface Membership {
  id: string
  member_id: string
  gym_id: string
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
  id: string
  member_id: string
  gym_id: string
  checked_in_at: string
}

export interface GymPost {
  id: string
  gym_id: string
  author_id: string
  title: string
  body: string | null
  post_type: 'challenge' | 'event' | 'offer' | 'announcement'
  image_url: string | null
  starts_at: string | null
  ends_at: string | null
  is_published: boolean
  created_at: string
}

export interface Lead {
  id: string
  gym_id: string
  name: string
  phone: string
  goal: string | null
  source: 'gym_page' | 'referral' | 'trial' | 'walkin' | 'other'
  referrer_member_id: string | null
  status: 'new' | 'contacted' | 'converted' | 'lost'
  notes: string | null
  created_at: string
}

export interface Badge {
  id: string
  member_id: string
  badge_type: string
  earned_at: string
}

// View types
export interface ActiveMembership {
  member_id: string
  member_name: string
  member_phone: string
  gym_id: string
  is_active: boolean
  expiry_date: string | null
  amount: number | null
  plan_type: string | null
  payment_method: string | null
  membership_status: 'overdue' | 'expiring_soon' | 'active'
  days_overdue: number | null
}

// Component prop types
export interface MemberWithMembership extends Member {
  latest_membership?: Membership
  membership_status?: 'overdue' | 'expiring_soon' | 'active' | 'no_plan'
  days_overdue?: number
  last_attendance?: string
}
