-- C7: Secure application creation at the database boundary.
--
-- Applicants may create applications only for approved jobs,
-- only for themselves, with the canonical initial status.
-- CV paths, when supplied during the legacy flow, must belong
-- to the authenticated user's own storage folder.

CREATE OR REPLACE FUNCTION public.enforce_application_insert_restrictions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to submit an application.';
  END IF;

  IF NEW.applicant_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You may only submit applications for yourself.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.jobs j
    WHERE j.id = NEW.job_id
      AND j.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'This job is not accepting applications.';
  END IF;

  IF NEW.status IS DISTINCT FROM 'applied' THEN
    RAISE EXCEPTION 'New applications must start with applied status.';
  END IF;

  IF NEW.cv_url IS NOT NULL
     AND auth.uid()::text IS DISTINCT FROM (storage.foldername(NEW.cv_url))[1]
  THEN
    RAISE EXCEPTION 'You may only attach your own CV.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_enforce_insert_restrictions
ON public.applications;

CREATE TRIGGER applications_enforce_insert_restrictions
BEFORE INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_application_insert_restrictions();

REVOKE EXECUTE
ON FUNCTION public.enforce_application_insert_restrictions()
FROM PUBLIC, anon, authenticated;
