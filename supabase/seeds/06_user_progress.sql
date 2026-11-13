insert into user_progress (user_id, word_id, box, due, client_updated_ms)
values
    -- مبتدی: چند کلمه سررسیدشده، چند کلمه در آینده، یکی کاملاً یادگرفته
    ('a0000000-0000-4000-8000-000000000002', 1, 1, date_trunc('day', now()) - interval '1 day', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 2, 1, date_trunc('day', now()) - interval '1 day', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 3, 1, date_trunc('day', now()), floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 4, 2, date_trunc('day', now()), floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 5, 2, date_trunc('day', now()) + interval '1 day', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 6, 3, date_trunc('day', now()) + interval '2 days', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 7, 3, date_trunc('day', now()) + interval '2 days', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 8, 4, date_trunc('day', now()) + interval '5 days', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 9, 5, date_trunc('day', now()) + interval '10 days', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000002', 10, 6, null, floor(extract(epoch from now()) * 1000)::bigint),
    -- پیشرفته: فقط چند کلمه سطح بالاتر
    ('a0000000-0000-4000-8000-000000000003', 28, 3, date_trunc('day', now()) + interval '2 days', floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000003', 29, 1, date_trunc('day', now()), floor(extract(epoch from now()) * 1000)::bigint),
    ('a0000000-0000-4000-8000-000000000003', 37, 6, null, floor(extract(epoch from now()) * 1000)::bigint);