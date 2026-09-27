-- C9: Database-backed AI rate limiting.
--
-- Limits authenticated users to 10 AI requests per 10-minute window
-- per endpoint. The counter is updated atomically so concurrent requests
-- cannot bypass the limit.

CREATE TABLE public.ai_rate_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, endpoint, window_start),
  CONSTRAINT ai_rate_limits_request_count_check
    CHECK (request_count >= 0)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(
  _endpoint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _window_start timestamptz;
  _new_count integer;
BEGIN
  _user_id := auth.uid();

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF _endpoint IS NULL OR length(trim(_endpoint)) = 0 THEN
    RAISE EXCEPTION 'AI endpoint is required.';
  END IF;

  _window_start := to_timestamp(
    floor(extract(epoch FROM now()) / (10 * 60))
    * (10 * 60)
  );

  INSERT INTO public.ai_rate_limits (
    user_id,
    endpoint,
    window_start,
    request_count
  )
  VALUES (
    _user_id,
    trim(_endpoint),
    _window_start,
    1
  )
  ON CONFLICT (user_id, endpoint, window_start)
  DO UPDATE SET request_count = public.ai_rate_limits.request_count + 1
  RETURNING request_count INTO _new_count;

  RETURN _new_count <= 10;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.check_ai_rate_limit(text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.check_ai_rate_limit(text)
TO authenticated;

