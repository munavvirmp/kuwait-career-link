-- Restrict company and job creation to employer/admin roles.

DROP POLICY IF EXISTS "companies owner insert" ON public.companies;

CREATE POLICY "companies employer insert"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'employer'::public.app_role)
    AND owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "jobs employer insert" ON public.jobs;

CREATE POLICY "jobs employer insert"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'employer'::public.app_role)
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_id
        AND c.owner_id = auth.uid()
    )
  )
);
