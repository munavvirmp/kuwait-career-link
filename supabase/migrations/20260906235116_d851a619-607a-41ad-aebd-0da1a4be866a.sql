UPDATE public.applications SET status = CASE
  WHEN status IN ('submitted','under_review') THEN 'applied'
  WHEN status = 'hired' THEN 'selected'
  WHEN status IN ('applied','shortlisted','interview','selected','rejected') THEN status
  ELSE 'applied' END;

ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'applied';

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications ADD CONSTRAINT applications_status_check
  CHECK (status IN ('applied','shortlisted','interview','selected','rejected'));

DELETE FROM public.applications a USING public.applications b
  WHERE a.applicant_id IS NOT NULL AND a.applicant_id = b.applicant_id AND a.job_id = b.job_id AND a.created_at > b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS applications_unique_applicant_job
  ON public.applications (applicant_id, job_id) WHERE applicant_id IS NOT NULL;