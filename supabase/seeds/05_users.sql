insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
        'authenticated', 'authenticated', 'admin@papita.test',
        extensions.crypt('password123', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"],"role":"admin"}',
        '{"full_name":"مدیر پاپیتا"}', now(), now(), '', '', '', ''),
       ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002',
        'authenticated', 'authenticated', 'test@example.com',
        extensions.crypt('password', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"],"role":"admin"}',
        '{"full_name":"کاربر تستی"}', now(), now(), '', '', '', ''),
       ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003',
        'authenticated', 'authenticated', 'advanced@papita.test',
        extensions.crypt('password123', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"کاربر پیشرفته"}', now(), now(), '', '', '', '');

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(),
       id,
       id::text,
       'email',
       jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
       now(),
       now(),
       now()
from auth.users
where email like '%@papita.test';

-- اگر Profile وجود نداشته باشد، ساخته می‌شود.
-- اگر وجود داشته باشد (trigger ساخته است)، اطلاعاتش به‌روزرسانی می‌شود.
-- کاربر ۱ عمداً آواتار ندارد تا تصویر پیش‌فرض دیده شود.
-- created_at عمداً متفاوت است تا مرتب‌سازی پیش‌فرض (بر اساس created_at) دیده شود.
insert into profiles (id, fullname, email, phone, avatar_url, age, level, settings, created_at)
values
    ('a0000000-0000-4000-8000-000000000001', 'مدیر پاپیتا', 'admin@papita.test',
     '+989121111111', null, 35, 1, '{}', now() - interval '30 days'),
    ('a0000000-0000-4000-8000-000000000002', 'کاربر تستی', 'test@example.com',
     '+989122222222', 'https://i.pravatar.cc/150?img=12', 28, 1, '{"autoSpeak": true, "deckSize": 10}',
     now() - interval '10 days'),
    ('a0000000-0000-4000-8000-000000000003', 'کاربر پیشرفته', 'advanced@papita.test',
     null, 'https://i.pravatar.cc/150?img=5', 22, 4, '{"autoSpeak": false, "deckSize": 20}',
     now() - interval '2 days')
on conflict (id)
    do update set
                  fullname   = excluded.fullname,
                  email      = excluded.email,
                  phone      = excluded.phone,
                  avatar_url = excluded.avatar_url,
                  age        = excluded.age,
                  level      = excluded.level,
                  settings   = excluded.settings,
                  created_at = excluded.created_at;