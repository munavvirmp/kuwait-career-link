CREATE POLICY "company docs owner insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-docs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "company docs owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'company-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "company docs owner delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-docs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));