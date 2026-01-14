-- Fix 1: Update get_agent_by_email to require admin authorization and validate email
CREATE OR REPLACE FUNCTION public.get_agent_by_email(_email text)
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can lookup users by email
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can lookup users by email';
  END IF;
  
  -- Validate email format
  IF _email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  RETURN QUERY
  SELECT p.user_id, p.full_name
  FROM auth.users u
  JOIN public.profiles p ON p.user_id = u.id
  WHERE u.email = _email
    AND p.role IN ('agent', 'admin');
END;
$$;

-- Fix 2: Update get_new_users_analytics to require admin authorization
CREATE OR REPLACE FUNCTION public.get_new_users_analytics(period_type text DEFAULT 'day'::text, days_back integer DEFAULT 30)
RETURNS TABLE(period text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can access analytics
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can access analytics';
  END IF;

  CASE period_type
    WHEN 'day' THEN
      RETURN QUERY
      SELECT 
        to_char(p.created_at, 'YYYY-MM-DD') as period,
        COUNT(*) as count
      FROM profiles p
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
      GROUP BY to_char(p.created_at, 'YYYY-MM-DD')
      ORDER BY period;
      
    WHEN 'week' THEN
      RETURN QUERY
      SELECT 
        to_char(p.created_at, 'YYYY-"W"WW') as period,
        COUNT(*) as count
      FROM profiles p
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '1 week' * (days_back / 7)
      GROUP BY to_char(p.created_at, 'YYYY-"W"WW')
      ORDER BY period;
      
    WHEN 'month' THEN
      RETURN QUERY
      SELECT 
        to_char(p.created_at, 'YYYY-MM') as period,
        COUNT(*) as count
      FROM profiles p
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '1 month' * (days_back / 30)
      GROUP BY to_char(p.created_at, 'YYYY-MM')
      ORDER BY period;
      
    WHEN 'quarter' THEN
      RETURN QUERY
      SELECT 
        to_char(p.created_at, 'YYYY-Q') as period,
        COUNT(*) as count
      FROM profiles p
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '1 quarter' * (days_back / 90)
      GROUP BY to_char(p.created_at, 'YYYY-Q')
      ORDER BY period;
      
    ELSE
      RETURN QUERY
      SELECT 
        to_char(p.created_at, 'YYYY-MM-DD') as period,
        COUNT(*) as count
      FROM profiles p
      WHERE p.created_at >= CURRENT_DATE - INTERVAL '1 day' * days_back
      GROUP BY to_char(p.created_at, 'YYYY-MM-DD')
      ORDER BY period;
  END CASE;
END;
$$;

-- Fix 3: Update get_session_analytics to require admin authorization
CREATE OR REPLACE FUNCTION public.get_session_analytics(period_type text DEFAULT 'day'::text, days_back integer DEFAULT 30)
RETURNS TABLE(period text, avg_duration_minutes numeric, session_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can access analytics
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can access analytics';
  END IF;

  CASE period_type
    WHEN 'day' THEN
      RETURN QUERY
      SELECT 
        to_char(s.session_start, 'YYYY-MM-DD') as period,
        ROUND(AVG(EXTRACT(EPOCH FROM (s.session_end - s.session_start)) / 60), 2) as avg_duration_minutes,
        COUNT(*) as session_count
      FROM user_sessions s
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '1 day' * days_back
        AND s.session_end IS NOT NULL
      GROUP BY to_char(s.session_start, 'YYYY-MM-DD')
      ORDER BY period;
      
    WHEN 'week' THEN
      RETURN QUERY
      SELECT 
        to_char(s.session_start, 'YYYY-"W"WW') as period,
        ROUND(AVG(EXTRACT(EPOCH FROM (s.session_end - s.session_start)) / 60), 2) as avg_duration_minutes,
        COUNT(*) as session_count
      FROM user_sessions s
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '1 week' * (days_back / 7)
        AND s.session_end IS NOT NULL
      GROUP BY to_char(s.session_start, 'YYYY-"W"WW')
      ORDER BY period;
      
    WHEN 'month' THEN
      RETURN QUERY
      SELECT 
        to_char(s.session_start, 'YYYY-MM') as period,
        ROUND(AVG(EXTRACT(EPOCH FROM (s.session_end - s.session_start)) / 60), 2) as avg_duration_minutes,
        COUNT(*) as session_count
      FROM user_sessions s
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '1 month' * (days_back / 30)
        AND s.session_end IS NOT NULL
      GROUP BY to_char(s.session_start, 'YYYY-MM')
      ORDER BY period;
      
    WHEN 'quarter' THEN
      RETURN QUERY
      SELECT 
        to_char(s.session_start, 'YYYY-Q') as period,
        ROUND(AVG(EXTRACT(EPOCH FROM (s.session_end - s.session_start)) / 60), 2) as avg_duration_minutes,
        COUNT(*) as session_count
      FROM user_sessions s
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '1 quarter' * (days_back / 90)
        AND s.session_end IS NOT NULL
      GROUP BY to_char(s.session_start, 'YYYY-Q')
      ORDER BY period;
      
    ELSE
      RETURN QUERY
      SELECT 
        to_char(s.session_start, 'YYYY-MM-DD') as period,
        ROUND(AVG(EXTRACT(EPOCH FROM (s.session_end - s.session_start)) / 60), 2) as avg_duration_minutes,
        COUNT(*) as session_count
      FROM user_sessions s
      WHERE s.session_start >= CURRENT_DATE - INTERVAL '1 day' * days_back
        AND s.session_end IS NOT NULL
      GROUP BY to_char(s.session_start, 'YYYY-MM-DD')
      ORDER BY period;
  END CASE;
END;
$$;

-- Fix 4: Update start_user_session to validate caller can only manage own sessions
CREATE OR REPLACE FUNCTION public.start_user_session(_user_id uuid, _ip_address text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_id uuid;
BEGIN
  -- Validate: user can only manage own sessions (unless admin)
  IF _user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Cannot manage sessions for other users';
  END IF;

  -- End any existing open sessions for this user
  UPDATE user_sessions 
  SET session_end = now()
  WHERE user_id = _user_id AND session_end IS NULL;
  
  -- Create new session
  INSERT INTO user_sessions (user_id, ip_address, user_agent)
  VALUES (_user_id, _ip_address, _user_agent)
  RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$;

-- Fix 5: Update end_user_session to validate caller can only manage own sessions
CREATE OR REPLACE FUNCTION public.end_user_session(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate: user can only manage own sessions (unless admin)
  IF _user_id != auth.uid() AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Cannot manage sessions for other users';
  END IF;

  UPDATE user_sessions 
  SET session_end = now()
  WHERE user_id = _user_id AND session_end IS NULL;
  
  RETURN FOUND;
END;
$$;