-- 1. Verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending','verified','rejected','suspended');

ALTER TABLE public.companies
  ADD COLUMN cr_number text,
  ADD COLUMN phone text,
  ADD COLUMN address text,
  ADD COLUMN representative_name text,
  ADD COLUMN verification_status public.verification_status NOT NULL DEFAULT 'pending',
  ADD COLUMN verification_notes text,
  ADD COLUMN verified_at timestamptz,
  ADD COLUMN submitted_for_review_at timestamptz;

-- Demo companies are treated as verified so existing sample data keeps working
UPDATE public.companies SET verification_status = 'verified', verified_at = now() WHERE is_demo = true;

-- 2. Company documents
CREATE TABLE public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by uuid,
  doc_type text NOT NULL DEFAULT 'other',
  file_name text NOT NULL,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company documents read" ON public.company_documents FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

CREATE POLICY "company documents insert" ON public.company_documents FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

CREATE POLICY "company documents delete" ON public.company_documents FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.owner_id = auth.uid()));

-- 3. Job reports
CREATE TABLE public.job_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_reports_reason_check CHECK (reason IN ('fake_job','scam','incorrect_salary','misleading','duplicate','impersonation','other')),
  CONSTRAINT job_reports_status_check CHECK (status IN ('open','reviewing','actioned','dismissed'))
);

CREATE INDEX job_reports_job_id_idx ON public.job_reports(job_id);
CREATE UNIQUE INDEX job_reports_unique_reporter ON public.job_reports(job_id, reporter_id);

GRANT SELECT, INSERT ON public.job_reports TO authenticated;
GRANT UPDATE, DELETE ON public.job_reports TO authenticated;
GRANT ALL ON public.job_reports TO service_role;
ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job reports insert own" ON public.job_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "job reports read" ON public.job_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "job reports admin update" ON public.job_reports FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "job reports admin delete" ON public.job_reports FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER job_reports_touch BEFORE UPDATE ON public.job_reports
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Only verified companies may have approved (publicly visible) jobs
CREATE OR REPLACE FUNCTION public.enforce_verified_company_for_approved_jobs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.verification_status;
BEGIN
  IF NEW.status = 'approved' THEN
    SELECT verification_status INTO v FROM public.companies WHERE id = NEW.company_id;
    IF v IS DISTINCT FROM 'verified' THEN
      RAISE EXCEPTION 'Jobs can only be published for verified companies';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_require_verified_company
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW EXECUTE FUNCTION public.enforce_verified_company_for_approved_jobs();

-- When a company stops being verified, its public jobs are pulled back
CREATE OR REPLACE FUNCTION public.unpublish_jobs_on_unverify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM 'verified' AND OLD.verification_status = 'verified' THEN
    UPDATE public.jobs SET status = 'pending' WHERE company_id = NEW.id AND status = 'approved';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER companies_unpublish_on_unverify
AFTER UPDATE OF verification_status ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.unpublish_jobs_on_unverify();

-- 5. Public reads restricted to verified companies
DROP POLICY "companies public read" ON public.companies;
CREATE POLICY "companies public read" ON public.companies FOR SELECT TO anon, authenticated
USING ((is_active AND verification_status = 'verified') OR owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "jobs public read approved" ON public.jobs;
CREATE POLICY "jobs public read approved" ON public.jobs FOR SELECT TO anon, authenticated
USING (status = 'approved' AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = jobs.company_id AND c.verification_status = 'verified' AND c.is_active));