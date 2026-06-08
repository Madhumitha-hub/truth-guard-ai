-- 1) Add UPDATE policy on storage.objects for media bucket (own folder only)
CREATE POLICY "Media update own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (auth.uid())::text)
WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = (auth.uid())::text);

-- 2) Explicit deny on user_roles writes for authenticated (service_role bypasses RLS)
CREATE POLICY "Roles no self insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "Roles no self update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Roles no self delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- 3) Revoke EXECUTE on trigger function from public/authenticated (only auth trigger needs it, runs as definer)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;