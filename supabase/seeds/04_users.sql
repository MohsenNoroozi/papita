insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                        confirmation_token, recovery_token, email_change, email_change_token_new)
values ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
        'authenticated', 'authenticated', 'admin@papita.test',
        extensions.crypt('password123', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"],"role":"admin"}', '{}', now(), now(), '', '', '', ''),
       ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000002',
        'authenticated', 'authenticated', 'test@example.com',
        extensions.crypt('password', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
       ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000003',
        'authenticated', 'authenticated', 'advanced@papita.test',
        extensions.crypt('password123', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');

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

insert into profiles (id, level, settings)
values ('a0000000-0000-4000-8000-000000000001', 1, '{}'),
       ('a0000000-0000-4000-8000-000000000002', 1, '{
         "autoSpeak": true,
         "deckSize": 10
       }'),
       ('a0000000-0000-4000-8000-000000000003', 4, '{
         "autoSpeak": false,
         "deckSize": 20
       }');