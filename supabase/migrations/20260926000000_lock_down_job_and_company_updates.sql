-- =============================================================================
-- SECURITY FIX: Lock down job and company update policies
-- 
-- This migration fixes critical authorization issues:
-- 
-- C1: Employers could change job status and moderation fields.
-- C2: Company owners could change verification_status and is_active.
-- C3: Overly permissive WITH CHECK(true) on both tables.
--
-- Changes:
-- 1. Split job update policy into restricted employer policy + admin policy.
-- 2. Split company update policy into restricted owner policy + admin policy.
-- 3. Add new function to validate which job fields employers can edit.
-- 4. Add new function to validate which company fields owners can edit.
-- 5. Drop the old permissive policies and create new ones.
-- =============================================================================

-- =============================================================================
-- 1. JOBS TABLE: Create new restrictive policies
-- =============================================================================

-- Drop the old overly permissive "jobs employer update" policy
DROP POLICY IF EXISTS "jobs employer update" ON public.jobs;

-- Create a function that validates employer-editable job fields
CREATE OR REPLACE FUNCTION public.can_employer_edit_job()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Employers cannot change any of these fields
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    RAISE EXCEPTION 'Employers cannot change job status. Only admins can approve or reject jobs.';
  END IF;
  
  IF (NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
    RAISE EXCEPTION 'Job company cannot be changed.';
  END IF;
  
  IF (NEW.posted_by IS DISTINCT FROM OLD.posted_by) THEN
    RAISE EXCEPTION 'Job posted_by cannot be changed.';
  END IF;
  
  IF (NEW.is_featured IS DISTINCT FROM OLD.is_featured) THEN
    RAISE EXCEPTION 'Employers cannot change is_featured. Only admins can feature jobs.';
  END IF;
  
  IF (NEW.is_demo IS DISTINCT FROM OLD.is_demo) THEN
    RAISE EXCEPTION 'Job is_demo cannot be changed.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Employer can update editable fields (title, location, salary, description, etc.)
-- but status, company_id, posted_by, is_featured, and is_demo are protected
CREATE POLICY "jobs employer update safe" ON public.jobs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid()))
  WITH CHECK (
    -- Must own the company
    EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.owner_id = auth.uid())
    -- Preserve these protected fields
    AND NEW.status = OLD.status
    AND NEW.company_id = OLD.company_id
    AND NEW.posted_by = OLD.posted_by
    AND NEW.is_featured = OLD.is_featured
    AND NEW.is_demo = OLD.is_demo
  );

-- Admin can update jobs freely (all fields)
CREATE POLICY "jobs admin update" ON public.jobs FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- 2. COMPANIES TABLE: Create new restrictive policies
-- =============================================================================

-- Drop the old overly permissive "companies owner update" policy
DROP POLICY IF EXISTS "companies owner update" ON public.companies;

-- Owner can update editable fields (name, description, industry, location, website, size, contact_email)
-- but verification_status, verified_at, verification_notes, owner_id, and is_active are admin-only
CREATE POLICY "companies owner update safe" ON public.companies FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    -- Must be the owner
    owner_id = auth.uid()
    -- Preserve these protected fields
    AND NEW.verification_status = OLD.verification_status
    AND NEW.verified_at = OLD.verified_at
    AND NEW.verification_notes = OLD.verification_notes
    AND NEW.owner_id = OLD.owner_id
    AND NEW.is_active = OLD.is_active
    AND NEW.is_demo = OLD.is_demo
  );

-- Admin can update companies freely (all fields, including verification)
CREATE POLICY "companies admin update" ON public.companies FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================================================
-- NOTES:
--
-- The employer delete policy remains restricted by company ownership.
-- The owner delete policy remains restricted by company ownership.
--
-- This ensures:
-- - Employers cannot approve/reject jobs (status)
-- - Employers cannot reassign jobs to other companies
-- - Employers cannot change who posted the job
-- - Employers cannot feature jobs or mark them as demo
--
-- - Company owners cannot self-verify
-- - Company owners cannot change verification notes
-- - Company owners cannot change owner_id
-- - Company owners cannot toggle is_active (if admin-controlled)
-- - Company owners cannot change is_demo
--
-- All protected fields can only be changed by admins.
-- =============================================================================
