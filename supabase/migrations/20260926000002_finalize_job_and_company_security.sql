-- =============================================================================
-- SECURITY FIX: Finalize job and company authorization enforcement
-- 
-- This migration provides the final Phase 1 database security fixes for:
-- 
-- C1: Employers cannot bypass job approval
-- C2: Company owners cannot self-verify
-- C3: INSERT policies enforce moderation/verification separation
--
-- This migration:
-- 1. Replaces the job trigger function with improved field restriction logic
-- 2. Replaces the company trigger function with corrected INSERT behavior
-- 3. Enforces protected fields through BEFORE INSERT/UPDATE triggers
-- 4. Allows admins to bypass all restrictions
-- 5. Prevents non-admin users from setting moderation/verification fields
-- 6. Does not change existing RLS policies or column defaults
-- 7. Hardens SECURITY DEFINER functions by revoking direct API execution
--
-- =============================================================================

-- =============================================================================
-- 1. JOBS: Final protected field enforcement
-- =============================================================================

-- Drop existing trigger to replace function
DROP TRIGGER IF EXISTS jobs_enforce_field_restrictions ON public.jobs;

-- Replace job field restriction function with final version
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
    -- Non-admins cannot create approved jobs (only admins can approve)
    IF NEW.status != 'pending' THEN
      RAISE EXCEPTION 'Only admins can create jobs with status other than pending';
    END IF;
    
    -- Non-admins cannot create featured jobs
    IF NEW.is_featured != false THEN
      RAISE EXCEPTION 'Only admins can create featured jobs';
    END IF;
    
    -- Non-admins cannot create demo jobs
    IF NEW.is_demo != false THEN
      RAISE EXCEPTION 'Only admins can create demo jobs';
    END IF;
    
    -- Non-admins cannot set posted_by to another user
    IF NEW.posted_by IS NOT NULL AND NEW.posted_by != auth.uid() THEN
      RAISE EXCEPTION 'You can only post jobs under your own user ID';
    END IF;
    
    -- Ensure posted_by is the current user
    NEW.posted_by := auth.uid();
    
    RETURN NEW;
  END IF;

  -- For UPDATE operations, enforce that non-admins cannot change protected fields
  IF TG_OP = 'UPDATE' THEN
    -- Prevent status changes (moderation-only)
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Employers cannot change job status. Only admins can approve or reject jobs.';
    END IF;
    
    -- Prevent company_id changes (ownership)
    IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Job company cannot be changed.';
    END IF;
    
    -- Prevent posted_by changes (ownership)
    IF NEW.posted_by IS DISTINCT FROM OLD.posted_by THEN
      RAISE EXCEPTION 'Job posted_by cannot be changed.';
    END IF;
    
    -- Prevent is_featured changes (moderation-only)
    IF NEW.is_featured IS DISTINCT FROM OLD.is_featured THEN
      RAISE EXCEPTION 'Employers cannot change is_featured. Only admins can feature jobs.';
    END IF;
    
    -- Prevent is_demo changes (demo-only)
    IF NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
      RAISE EXCEPTION 'Job is_demo cannot be changed.';
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate trigger on jobs table
CREATE TRIGGER jobs_enforce_field_restrictions
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_job_field_restrictions();

-- =============================================================================
-- 2. COMPANIES: Final protected field enforcement with corrected INSERT
-- =============================================================================

-- Drop existing trigger to replace function
DROP TRIGGER IF EXISTS companies_enforce_field_restrictions ON public.companies;

-- Replace company field restriction function with final version
-- This version correctly handles is_active default and enforces protected fields
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

  -- For INSERT operations, enforce that non-admins start in unverified/inactive state
  IF TG_OP = 'INSERT' THEN
    -- Reject attempts to set verification_status to verified
    IF NEW.verification_status IS NOT NULL AND NEW.verification_status != 'pending'::public.verification_status THEN
      RAISE EXCEPTION 'Only admins can set company verification status';
    END IF;
    
    -- Reject attempts to set verification_notes
    IF NEW.verification_notes IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can set verification notes';
    END IF;
    
    -- Reject attempts to set verified_at
    IF NEW.verified_at IS NOT NULL THEN
      RAISE EXCEPTION 'Only admins can set verification timestamp';
    END IF;
    
    -- Reject attempts to assign company to another owner
    IF NEW.owner_id IS NOT NULL AND NEW.owner_id != auth.uid() THEN
      RAISE EXCEPTION 'You can only own companies created under your own user ID';
    END IF;
    
    -- Reject attempts to create demo companies
    IF NEW.is_demo IS NOT NULL AND NEW.is_demo != false THEN
      RAISE EXCEPTION 'Only admins can mark companies as demo';
    END IF;
    
    -- Force non-admins to create inactive companies
    -- (regardless of what the schema default or client provided)
    NEW.is_active := false;
    NEW.owner_id := auth.uid();
    NEW.verification_status := 'pending'::public.verification_status;
    NEW.verification_notes := NULL;
    NEW.verified_at := NULL;
    NEW.is_demo := false;
    
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

-- Recreate trigger on companies table
CREATE TRIGGER companies_enforce_field_restrictions
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.enforce_company_field_restrictions();

-- =============================================================================
-- 3. SECURITY HARDENING: Revoke direct execution of trigger functions
-- =============================================================================

-- Prevent unauthenticated and authenticated roles from directly calling these
-- functions. Trigger execution is not affected by these revokes.
REVOKE ALL ON FUNCTION public.enforce_job_field_restrictions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_company_field_restrictions() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- NOTES:
--
-- EXISTING RLS POLICIES REMAIN UNCHANGED
--
-- The existing UPDATE policies remain broad (WITH CHECK true), but the
-- BEFORE UPDATE triggers now enforce protected-field restrictions.
--
-- The existing INSERT policies remain:
-- - "jobs employer insert": requires company ownership
-- - "companies owner insert": requires owner_id = auth.uid()
--
-- The triggers work in conjunction with RLS:
-- - RLS determines row access (which jobs/companies can be touched)
-- - Triggers enforce field-level restrictions (which columns can change)
--
-- ADMIN BYPASS
--
-- Admins (verified via has_role) bypass all trigger restrictions on both
-- INSERT and UPDATE. Admins can therefore:
-- - Create jobs with status = approved
-- - Change job status, is_featured, is_demo
-- - Create verified/active companies
-- - Change company verification_status and is_active
--
-- NON-ADMIN ENFORCEMENT
--
-- Non-admins (job seekers, employers):
-- - Cannot create or update jobs with moderation-controlled fields
-- - Cannot create companies with verification-controlled fields
-- - Cannot create active companies (start as is_active = false)
-- - New companies automatically start as verification_status = pending
-- - Updates to protected fields are rejected with clear error messages
--
-- COMPATIBILITY
--
-- - Employer company insertion (without is_active) works correctly
-- - Employer job insertion works with existing defaults
-- - Admin operations retain full control
-- - Existing employer UIs are not broken
--
-- PROTECTED FIELDS
--
-- Jobs (moderation):
-- - status
-- - company_id
-- - posted_by
-- - is_featured
-- - is_demo
--
-- Companies (verification/admin):
-- - verification_status
-- - verification_notes
-- - verified_at
-- - owner_id
-- - is_active
-- - is_demo
--
-- =============================================================================
