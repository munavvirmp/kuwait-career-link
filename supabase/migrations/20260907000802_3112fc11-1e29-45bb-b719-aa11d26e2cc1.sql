REVOKE ALL ON FUNCTION public.enforce_verified_company_for_approved_jobs() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.unpublish_jobs_on_unverify() FROM anon, authenticated;