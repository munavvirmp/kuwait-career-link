-- Lock down SECURITY DEFINER trigger functions from API roles
REVOKE ALL ON FUNCTION public.enforce_verified_company_for_approved_jobs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.unpublish_jobs_on_unverify() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- has_role must stay callable by signed-in users because RLS policies evaluate it,
-- but anonymous visitors have no reason to call it.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Allow company owners (and admins) to overwrite their own verification documents
CREATE POLICY "company docs owner update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-docs' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
)
WITH CHECK (
  bucket_id = 'company-docs' AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);