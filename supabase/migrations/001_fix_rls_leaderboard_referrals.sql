-- Fix RLS policies for leaderboard and referral features
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Allow members to view gym-wide attendance (needed for leaderboard)
-- Without this, members can only see their own attendance, making the leaderboard show only themselves.
CREATE POLICY "Members can view gym attendance for leaderboard"
  ON attendance FOR SELECT USING (
    gym_id IN (SELECT gym_id FROM members WHERE user_id = auth.uid() AND is_active = true)
  );

-- 2. Allow members to view leads where they are the referrer (needed for referral tracking)
-- Without this, the referral page always shows 0 referrals because members can't read leads.
CREATE POLICY "Members can view own referrals"
  ON leads FOR SELECT USING (
    referrer_member_id IN (SELECT id FROM members WHERE user_id = auth.uid())
  );
