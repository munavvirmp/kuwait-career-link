-- C8: Enforce CV file size and MIME type restrictions at the
-- Supabase Storage bucket level.
--
-- CVs must be private, no larger than 10 MiB, and limited to
-- PDF, DOC, and DOCX MIME types.

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
WHERE id = 'cvs';
