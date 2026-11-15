-- ادمین بتواند در باکت avatars برای همه کاربران بنویسد/حذف کند
-- (اگر Admin با service role آپلود می‌کند این policy لازم نیست، ولی ضرری ندارد)
create policy avatars_admin_all on storage.objects
    for all to authenticated
    using (bucket_id = 'avatars' and public.is_admin())
    with check (bucket_id = 'avatars' and public.is_admin());

-- آدرس‌های کامل قدیمی که به هاست خاصی گره خورده‌اند ← فقط مسیر فایل
update profiles
set avatar_url = regexp_replace(avatar_url, '^.*/storage/v1/object/public/avatars/([^?]*).*$', '\1')
where avatar_url like '%/storage/v1/object/public/avatars/%';