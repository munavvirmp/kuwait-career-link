-- =============================================================================
-- SECURITY FIX: Lock down job and company authorization policies
-- 
-- This migration fixes critical authorization issues C1, C2, and C3:
-- 
-- C1: Employers could bypass approval by directly changing job status.
-- C2: Company owners could self-verify or change admin-controlled fields.
-- C3: INSERT policies did not restrict moderation/admin-controlled fields.
--
-- Approach:
-- - Use BEFORE INSERT/UPDATE triggers to validate protected fields.
-- - Triggers allow admin users to modify any field.
-- - Non-admin users cannot change protected fields.
-- - RLS policies remain the primary access control.
-- - Triggers add field-level restrictions for moderation separation.
-- =============================================================================

-- =============================================================================
-- JOBS: Protected field enforcement
-- =============================================================================

-- Create a trigger to enforce job field restrictions for non-admins
CREATE OR REPLACE FUNCTION public.enforce_job_field_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change any field
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For INSERT operations, enforce that non-admins cannot set moderation fields
  IF TG_OP = 'INSERT' THEN
    -- Non-admins must not set status to 'approved' or other admin-controlled values
    IF NEW.status != 'pending' THEN
      RAISE EXCEPTION 'Only admins can create jobs with status other than pending';
    END IF;
    
    -- Non-admins cannot set is_featured
    IF NEW.is_featured != false THEN
      RAISE EXCEPTION 'Only admins can create featured jobs';
    END IF;
    
    -- Non-admins cannot set is_demo
    IF NEW.is_demo != false THEN
      RAISE EXCEPTION 'Only admins can create demo jobs';
    END IF;
    
    -- Non-admins cannot set posted_by to arbitrary user
    IF NEW.posted_by IS NOT NULL AND NEW.posted_by != auth.uid() THEN
      RAISE EXCEPTION 'You can only create jobs under your own user ID';
    END IF;
    
    -- Ensure posted_by is the current user
    NEW.posted_by := auth.uid();
    
    RETURN NEW;
  END IF;

  -- For UPDATE operations, enforce that non-admins cannot change protected fields
  IF TG_OP = 'UPDATE' THEN
    -- Prevent status changes
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Employers cannot change job status. Only admins can approve or reject jobs.';
    END IF;
    
    -- Prevent company_id changes
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Job company cannot be changed.';
    END IF;
    
    -- Prevent posted_by changes
    IF NEW.posted_by IS DISTINCT FROM OLD.posted_by THEN
      RAISE EXCEPTION 'Job posted_by cannot be changed.';
    END IF;
    
    -- Prevent is_featured changes
    IF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
      RAISE EXCEPTION 'Employers cannot change is_featured. Only admins can feature jobs.';
    END IF;
    
    -- Prevent is_demo changes
    IF NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
      RAISE EXCEPTION 'Job is_demo cannot be changed.';
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to enforce restrictions on INSERT and UPDATE
CREATE TRIGGER jobs_enforce_field_restrictions
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_field_restrictions();

-- =============================================================================
-- COMPANIES: Protected field enforcement
-- =============================================================================

-- Create a trigger to enforce company field restrictions for non-admins
CREATE OR REPLACE FUNCTION public.enforce_company_field_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins can change any field
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For INSERT operations, enforce that non-admins cannot set admin-controlled fields
  IF TG_OP = 'INSERT' THEN
    -- Non-admins cannot set verification_status
    IF NEW.verification_status IS NOT NULL AND NEW.verification_status != 'pending'::public.verification_status THEN
      RAISE EXCEPTION 'Only admins can set company verification status. New companies start as pending.';
    END IF;
    
    -- Non-admins cannot set verification_notes
    IF NEW.verification_notes IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can set verification notes.';
    END IF;
    
    -- Non-admins cannot set verified_at
    IF NEW.verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can set verification timestamp.';
    END IF;
    
    -- Non-admins cannot set arbitrary owner_id
    IF NEW.owner_id IS NOT NULL AND NEW.owner_id != auth.uid() THEN
      RAISE EXCEPTION 'You can only own companies created under your own user ID.';
    END IF;
    
    -- Ensure owner_id is the current user
    NEW.owner_id := auth.uid();
    
    -- Non-admins cannot set is_active to true
    IF NEW.is_active != false THEN
      RAISE EXCEPTION 'Only admins can activate companies. New companies start inactive.';
    END IF;
    
    -- Non-admins cannot set is_demo
    IF NEW.is_demo != false THEN
      RAISE EXCEPTION 'Only admins can mark companies as demo.';
    END IF;
    
    -- Ensure verification_status defaults to pending for non-admins
    IF NEW.verification_status IS NULL THEN
      NEW.verification_status := 'pending'::public.verification_status;
    END IF;
    
    RETURN NEW;
  END IF;

  -- For UPDATE operations, enforce that non-admins cannot change protected fields
  IF TG_OP = 'UPDATE' THEN
    -- Prevent verification_status changes
    IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
      RAISE EXCEPTION 'Owners cannot change company verification status. Only admins can verify companies.';
    END IF;
    
    -- Prevent verification_notes changes
    IF NEW.verification_notes IS DISTINCT FROM OLD.verification_notes THEN
      RAISE EXCEPTION 'Company verification notes cannot be changed by non-admins.';
    END IF;
    
    -- Prevent verified_at changes
    IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
      RAISE EXCEPTION 'Company verification timestamp cannot be changed by non-admins.';
    END IF;
    
    -- Prevent owner_id changes
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Company owner cannot be changed.';
    END IF;
    
    -- Prevent is_active changes
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Company active status cannot be changed by non-admins. Only admins can activate companies.';
    END IF;
    
    -- Prevent is_demo changes
    IF NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
      RAISE EXCEPTION 'Company demo status cannot be changed.';
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger to enforce restrictions on INSERT and UPDATE
CREATE TRIGGER companies_enforce_field_restrictions
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.enforce_company_field_restrictions();

-- =============================================================================
-- NOTES:
--
-- These triggers work alongside the existing RLS policies:
--
-- Jobs:
-- - "jobs public read approved" — public read of approved jobs
-- - "jobs owner read" — owner/admin read of own/all jobs
-- - "jobs employer insert" — authenticated insert (now enforced via trigger)
-- - "jobs employer update" — authenticated update (now enforced via trigger)
-- - "jobs employer delete" — authenticated delete
--
-- Companies:
-- - "companies anon read verified" — anonymous read of verified active companies
-- - "companies authenticated read" — authenticated read of owned/verified/admin companies
-- - "companies owner insert" — authenticated insert (now enforced via trigger)
-- - "companies owner update" — authenticated update (now enforced via trigger)
-- - "companies owner delete" — authenticated delete
--
-- The RLS policies allow/deny access to entire rows.
-- The triggers restrict which field values non-admin users can set.
--
-- Admins (checked via has_role) can bypass all trigger restrictions.
-- Non-admins (job seekers, employers) cannot modify protected fields.
--
-- Protected Job Fields (moderation):
-- - status
-- - company_id
-- - posted_by
-- - is_featured
-- - is_demo
--
-- Protected Company Fields (verification and admin):
-- - verification_status
-- - verification_notes
-- - verified_at
-- - owner_id
-- - is_active
-- - is_demo
--
-- =============================================================================
