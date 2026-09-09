DROP POLICY IF EXISTS "companies public read" ON public.companies;

CREATE POLICY "companies anon read verified"
ON public.companies FOR SELECT TO anon
USING (is_active AND verification_status = 'verified'::verification_status);

CREATE POLICY "companies authenticated read"
ON public.companies FOR SELECT TO authenticated
USING (
  (is_active AND verification_status = 'verified'::verification_status)
  OR owner_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);