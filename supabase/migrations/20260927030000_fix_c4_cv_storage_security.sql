-- C4: Bind CV storage access to the authenticated user/application.
--
-- Profile CV:
--   user_id/<file>
-- Application CV:
--   user_id/application_id/<file>
--
-- Applicants may manage only their own CVs.
-- Employers may read CVs attached to applications for their companies.
-- Admins may read/manage all CVs.

DROP POLICY IF EXISTS "cv owner read" ON storage.objects;
DROP POLICY IF EXISTS "cv owner write" ON storage.objects;
DROP POLICY IF EXISTS "cv owner update" ON storage.objects;
DROP POLICY IF EXISTS "cv owner delete" ON storage.objects;

CREATE POLICY "cv secure read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)

    OR auth.uid()::text = (storage.foldername(name))[1]

    OR EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      JOIN public.companies c ON c.id = j.company_id
      WHERE c.owner_id = auth.uid()
        AND a.cv_url = storage.objects.name
    )
  )
);

CREATE POLICY "cv secure insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cvs'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    -- Profile CV: user_id/<file>
    array_length(storage.foldername(name), 1) = 1

    OR

    -- Application CV: user_id/application_id/<file>
    (
      array_length(storage.foldername(name), 1) = 2
      AND EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id::text = (storage.foldername(name))[2]
          AND a.applicant_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "cv secure update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cvs'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)

    OR (
      auth.uid()::text = (storage.foldername(name))[1]
      AND (
        array_length(storage.foldername(name), 1) = 1
        OR EXISTS (
          SELECT 1
          FROM public.applications a
          WHERE a.id::text = (storage.foldername(name))[2]
            AND a.applicant_id = auth.uid()
            AND a.cv_url = storage.objects.name
        )
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'cvs'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)

    OR (
      auth.uid()::text = (storage.foldername(name))[1]
      AND (
        array_length(storage.foldername(name), 1) = 1
        OR EXISTS (
          SELECT 1
          FROM public.applications a
          WHERE a.id::text = (storage.foldername(name))[2]
            AND a.applicant_id = auth.uid()
            AND a.cv_url = storage.objects.name
        )
      )
    )
  )
);

CREATE POLICY "cv secure delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'cvs'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)

    OR (
      auth.uid()::text = (storage.foldername(name))[1]
      AND (
        array_length(storage.foldername(name), 1) = 1
        OR EXISTS (
          SELECT 1
          FROM public.applications a
          WHERE a.id::text = (storage.foldername(name))[2]
            AND a.applicant_id = auth.uid()
            AND a.cv_url = storage.objects.name
        )
      )
    )
  )
);
