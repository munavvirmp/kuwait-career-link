-- =============================================================================
-- SECURITY FIX C6-1: Secure role assignment from signup metadata
--
-- Finding: User metadata role was being used directly to create privileged roles
-- Impact: A direct signup request with role=admin could create an admin user
-- Fix: ALWAYS assign only job_seeker role, never trust user-supplied metadata
--
-- This migration replaces the insecure handle_new_user() trigger function.
-- =============================================================================

-- Replace the trigger function to unconditionally assign job_seeker role
-- This function will execute AFTER INSERT on auth.users (created via Supabase Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create the user's profile (unchanged behavior)
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  
  -- SECURITY FIX: Always assign job_seeker role, never trust raw_user_meta_data.role
  -- This prevents privilege escalation through signup metadata.
  -- 
  -- Old behavior:
  --   VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'job_seeker')::public.app_role)
  -- New behavior:
  --   VALUES (NEW.id, 'job_seeker'::public.app_role)
  --
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'job_seeker'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- =============================================================================
-- NOTES:
--
-- ROLE ASSIGNMENT POLICY:
-- - New users always start as job_seeker
-- - Employer or admin roles must be assigned through a separate trusted workflow
-- - Frontend signup UI selector (job_seeker/employer) is now cosmetic only
-- - The metadata role parameter is captured for audit/logging but ignored
--
-- EXISTING ROLES:
-- - All existing public.user_roles entries remain unchanged
-- - Legitimate admin/employer users retain their roles
-- - This is a non-destructive migration
--
-- FUTURE ROLE ASSIGNMENT:
-- - Create a separate admin-only procedure to assign employer/admin roles
-- - Require explicit admin approval, not automatic assignment
-- - Audit and log role changes
--
-- SECURITY IMPLICATIONS:
-- - Privilege escalation via signup metadata is now impossible
-- - Even if an attacker crafts a direct Supabase Auth signup request with role=admin,
--   the trigger will assign only job_seeker
-- - Role assignment remains immutable by normal users (user_roles is protected)
-- - has_role() function continues to work as before
-- - RLS policies based on has_role() remain effective
-- =============================================================================
