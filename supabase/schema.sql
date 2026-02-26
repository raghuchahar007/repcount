-- RepCount Database Schema
-- Run this in Supabase SQL Editor

-- =============================================
-- PROFILES (extends Supabase auth.users)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, role)
  VALUES (NEW.id, NEW.phone, 'member');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- GYMS
-- =============================================
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT DEFAULT 'Agra',
  address TEXT,
  phone TEXT,
  description TEXT,
  logo_url TEXT,
  opening_time TIME,
  closing_time TIME,
  pricing JSONB DEFAULT '{}',
  facilities TEXT[] DEFAULT '{}',
  upi_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gyms_owner ON gyms(owner_id);
CREATE INDEX idx_gyms_slug ON gyms(slug);

-- =============================================
-- GYM PHOTOS
-- =============================================
CREATE TABLE gym_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gym_photos_gym ON gym_photos(gym_id);

-- =============================================
-- MEMBERS
-- =============================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  goal TEXT DEFAULT 'general' CHECK (goal IN ('weight_loss', 'muscle_gain', 'general')),
  diet_pref TEXT DEFAULT 'veg' CHECK (diet_pref IN ('veg', 'nonveg', 'egg')),
  budget TEXT DEFAULT 'medium' CHECK (budget IN ('low', 'medium', 'high')),
  join_date DATE DEFAULT CURRENT_DATE,
  dob DATE,
  emergency_phone TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phone, gym_id)
);

CREATE INDEX idx_members_gym ON members(gym_id);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_user ON members(user_id);

-- =============================================
-- MEMBERSHIPS (payment records)
-- =============================================
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'monthly' CHECK (plan_type IN ('monthly', 'quarterly', 'half_yearly', 'yearly')),
  amount DECIMAL NOT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'online')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memberships_member ON memberships(member_id);
CREATE INDEX idx_memberships_gym ON memberships(gym_id);
CREATE INDEX idx_memberships_expiry ON memberships(expiry_date);
CREATE INDEX idx_memberships_status ON memberships(status);

-- =============================================
-- ATTENDANCE
-- =============================================
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT now()
);

-- One check-in per day per member per gym
CREATE UNIQUE INDEX idx_attendance_daily
  ON attendance(member_id, gym_id, (checked_in_at::date));
CREATE INDEX idx_attendance_gym ON attendance(gym_id);
CREATE INDEX idx_attendance_date ON attendance((checked_in_at::date));

-- =============================================
-- DIET TEMPLATES
-- =============================================
CREATE TABLE diet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  diet_type TEXT NOT NULL CHECK (diet_type IN ('veg', 'nonveg', 'egg')),
  budget TEXT DEFAULT 'medium',
  language TEXT DEFAULT 'hi',
  meals JSONB NOT NULL,
  macros JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- WORKOUT TEMPLATES
-- =============================================
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  goal TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  days JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- GYM POSTS (challenges, events, offers)
-- =============================================
CREATE TABLE gym_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT,
  post_type TEXT CHECK (post_type IN ('challenge', 'event', 'offer', 'announcement')),
  image_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gym_posts_gym ON gym_posts(gym_id);

-- =============================================
-- CHALLENGE PARTICIPANTS
-- =============================================
CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES gym_posts(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, member_id)
);

-- =============================================
-- PROGRESS PHOTOS
-- =============================================
CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  taken_date DATE DEFAULT CURRENT_DATE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_progress_photos_member ON progress_photos(member_id);

-- =============================================
-- PROGRESS METRICS
-- =============================================
CREATE TABLE progress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  weight DECIMAL,
  chest DECIMAL,
  waist DECIMAL,
  biceps DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, date)
);

-- =============================================
-- LEADS
-- =============================================
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  goal TEXT,
  source TEXT DEFAULT 'gym_page' CHECK (source IN ('gym_page', 'referral', 'trial', 'walkin', 'other')),
  referrer_member_id UUID REFERENCES members(id),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_gym ON leads(gym_id);
CREATE INDEX idx_leads_status ON leads(status);

-- =============================================
-- REVIEWS
-- =============================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID REFERENCES gyms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(gym_id, member_id)
);

-- =============================================
-- BADGES
-- =============================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, badge_type)
);

CREATE INDEX idx_badges_member ON badges(member_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE diet_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gym_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, owners can read gym members
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Gyms: owners can manage their gyms, anyone can read public data
CREATE POLICY "Anyone can view gyms"
  ON gyms FOR SELECT USING (true);

CREATE POLICY "Owners can manage own gyms"
  ON gyms FOR ALL USING (auth.uid() = owner_id);

-- Members: owners see their gym's members, users see their own records
CREATE POLICY "Owners can view gym members"
  ON members FOR SELECT USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Owners can manage gym members"
  ON members FOR ALL USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members can view own record"
  ON members FOR SELECT USING (user_id = auth.uid());

-- Memberships: similar to members
CREATE POLICY "Owners can manage memberships"
  ON memberships FOR ALL USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members can view own memberships"
  ON memberships FOR SELECT USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Attendance: owners see gym attendance, members see own
CREATE POLICY "Owners can manage attendance"
  ON attendance FOR ALL USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members can view own attendance"
  ON attendance FOR SELECT USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can view gym attendance for leaderboard"
  ON attendance FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM members WHERE user_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Members can insert own attendance"
  ON attendance FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Templates: readable by everyone
CREATE POLICY "Anyone can read diet templates"
  ON diet_templates FOR SELECT USING (true);

CREATE POLICY "Anyone can read workout templates"
  ON workout_templates FOR SELECT USING (true);

-- Posts: readable by gym members, writable by owners
CREATE POLICY "Anyone can view published posts"
  ON gym_posts FOR SELECT USING (is_published = true);

CREATE POLICY "Owners can manage posts"
  ON gym_posts FOR ALL USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

-- Leads: only gym owners
CREATE POLICY "Owners can manage leads"
  ON leads FOR ALL USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

CREATE POLICY "Anyone can create leads"
  ON leads FOR INSERT WITH CHECK (true);

CREATE POLICY "Members can view own referrals"
  ON leads FOR SELECT USING (
    referrer_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Gym photos: anyone can view, owners can manage
CREATE POLICY "Anyone can view gym photos"
  ON gym_photos FOR SELECT USING (true);

CREATE POLICY "Owners can manage gym photos"
  ON gym_photos FOR ALL USING (
    gym_id IN (SELECT id FROM gyms WHERE owner_id = auth.uid())
  );

-- Progress: members own their data
CREATE POLICY "Members can manage own progress photos"
  ON progress_photos FOR ALL USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage own metrics"
  ON progress_metrics FOR ALL USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Reviews: anyone can read, members can write own
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Members can manage own reviews"
  ON reviews FOR ALL USING (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- Badges: readable by all, system-managed
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT USING (true);

-- Challenge participants
CREATE POLICY "Anyone can view participants"
  ON challenge_participants FOR SELECT USING (true);

CREATE POLICY "Members can join challenges"
  ON challenge_participants FOR INSERT WITH CHECK (
    member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );

-- =============================================
-- HELPER VIEWS
-- =============================================

-- Active memberships with member info
CREATE OR REPLACE VIEW active_memberships AS
SELECT
  m.id as member_id,
  m.name as member_name,
  m.phone as member_phone,
  m.gym_id,
  m.is_active,
  ms.expiry_date,
  ms.amount,
  ms.plan_type,
  ms.payment_method,
  CASE
    WHEN ms.expiry_date < CURRENT_DATE THEN 'overdue'
    WHEN ms.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'active'
  END as membership_status,
  (CURRENT_DATE - ms.expiry_date) as days_overdue
FROM members m
LEFT JOIN LATERAL (
  SELECT * FROM memberships
  WHERE member_id = m.id
  ORDER BY expiry_date DESC
  LIMIT 1
) ms ON true;

-- Daily attendance count per gym
CREATE OR REPLACE VIEW daily_attendance AS
SELECT
  gym_id,
  checked_in_at::date as date,
  COUNT(*) as check_ins
FROM attendance
GROUP BY gym_id, checked_in_at::date;
