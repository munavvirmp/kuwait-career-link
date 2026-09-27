-- C5: Lock down application updates by actor.
--
-- Employer/company owner: may update status only.
-- Applicant: may update cv_url only on their own application.
-- Admin: may update any application fields.
--
-- This trigger complements RLS because PostgreSQL RLS is row-level,
-- not column-level.

CREATE OR REPLACE FUNCTION public.enforce_application_update_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins are allowed to update application fields.
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Applicant: only cv_url may change.
  IF OLD.applicant_id = auth.uid() THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.job_id IS DISTINCT FROM OLD.job_id
      OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
      OR NEW.full_name IS DISTINCT FROM OLD.full_name
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.phone IS DISTINCT FROM OLD.phone
      OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.updated_at IS DISTINCT FROM OLD.updated_at
    THEN
      RAISE EXCEPTION 'Applicants may only update their CV.';
    END IF;

    RETURN NEW;
  END IF;

  -- Employer/company owner: only status may change.
  IF EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.id = OLD.job_id
      AND c.owner_id = auth.uid()
  ) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.job_id IS DISTINCT FROM OLD.job_id
      OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id
      OR NEW.full_name IS DISTINCT FROM OLD.full_name
      OR NEW.email IS DISTINCT FROM OLD.email
      OR NEW.phone IS DISTINCT FROM OLD.phone
      OR NEW.cv_url IS DISTINCT FROM OLD.cv_url
      OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Employers may only update application status.';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'You are not allowed to update this application.';
END;
$$;

DROP TRIGGER IF EXISTS applications_enforce_update_restrictions
ON public.applications;

CREATE TRIGGER applications_enforce_update_restrictions
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_application_update_restrictions();

REVOKE EXECUTE
ON FUNCTION public.enforce_application_update_restrictions()
FROM PUBLIC, anon, authenticated;

-- Replace the broad UPDATE policy.
DROP POLICY IF EXISTS "applications update"
ON public.applications;

CREATE POLICY "applications update"
ON public.applications
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR applicant_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.id = applications.job_id
      AND c.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR applicant_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.jobs j
    JOIN public.companies c ON c.id = j.company_id
    WHERE j.id = applications.job_id
      AND c.owner_id = auth.uid()
  )
);
