CREATE OR REPLACE FUNCTION get_leaderboard(p_gym_id uuid, p_since timestamptz DEFAULT NULL)
RETURNS TABLE(member_id uuid, member_name text, check_ins bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT a.member_id, m.name, COUNT(*) as check_ins
  FROM attendance a
  JOIN members m ON m.id = a.member_id
  WHERE a.gym_id = p_gym_id
    AND (p_since IS NULL OR a.checked_in_at >= p_since)
  GROUP BY a.member_id, m.name
  ORDER BY check_ins DESC
  LIMIT 50;
$$;
