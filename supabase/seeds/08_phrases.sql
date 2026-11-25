-- توابع کمکی موقت (فقط در همین session) برای ساخت JSON هر عبارت
create function pg_temp.sent(p int, en text, fa text) returns jsonb
    language sql as
$$
select jsonb_build_object('id', gen_random_uuid(), 'position', p, 'text', en,
                          'translations', jsonb_build_object('fa', fa))
           $$;

create function pg_temp.pc(variadic s jsonb[]) returns jsonb
    language sql as
$$
select jsonb_build_object('version', 1, 'sentences', to_jsonb(s))
           $$;

insert into phrases (id, media_id, start_ms, end_ms, content)
    overriding system value
values
    -- مدیا ۱: صوت منبع ۱۴
    (1, 1, 0, 3500, pg_temp.pc(
            pg_temp.sent(1, 'Action Boy can run.', 'اکشن‌بوی می‌تواند بدود.'),
            pg_temp.sent(2, 'He can run fast.', 'او می‌تواند سریع بدود.'))),
    (2, 1, 3500, 7200, pg_temp.pc(
            pg_temp.sent(1, 'Can he fly?', 'آیا او می‌تواند پرواز کند؟'),
            pg_temp.sent(2, 'Yes, he can!', 'بله، می‌تواند!'))),
    (3, 1, 7200, 11000, pg_temp.pc(
            pg_temp.sent(1, 'Look at the fox.', 'به روباه نگاه کن.'),
            pg_temp.sent(2, 'Hop over the pot.', 'از روی قابلمه بپر.'))),
    (4, 1, 11000, 15400, pg_temp.pc(
            pg_temp.sent(1, 'I can sing this song.', 'من می‌توانم این آهنگ را بخوانم.'),
            pg_temp.sent(2, 'I can make you smile.', 'من می‌توانم تو را بخندانم.'))),
    (5, 1, 15400, 19000, pg_temp.pc(
            pg_temp.sent(1, 'She can''t swim.', 'او نمی‌تواند شنا کند.'),
            pg_temp.sent(2, 'But she can jump.', 'اما او می‌تواند بپرد.'))),

    -- مدیا ۲: ویدیوی منبع ۱۴
    (6, 2, 1000, 5000, pg_temp.pc(
            pg_temp.sent(1, 'This is a very big cat.', 'این یک گربه بسیار بزرگ است.'))),
    (7, 2, 5000, 9800, pg_temp.pc(
            pg_temp.sent(1, 'This animal likes meat.', 'این حیوان گوشت را دوست دارد.'),
            pg_temp.sent(2, 'He likes fruit.', 'او میوه دوست دارد.'))),
    (8, 2, 9800, 14500, pg_temp.pc(
            pg_temp.sent(1, 'beautiful animals', 'حیوانات زیبا'),
            pg_temp.sent(2, 'I can do anything, if I try.', 'اگر تلاش کنم، می‌توانم هر کاری انجام بدهم.'))),

    -- مدیا ۳: صوت منبع ۱۵
    (9, 3, 0, 4200, pg_temp.pc(
            pg_temp.sent(1, 'It''s a wonderful day.', 'روز فوق العاده‌ای است.'),
            pg_temp.sent(2, 'We are going to the beach today.', 'ما امروز داریم به ساحل می‌رویم.'))),
    (10, 3, 4200, 8000, pg_temp.pc(
            pg_temp.sent(1, 'Let''s make a sandcastle.', 'بیا یک قلعه شنی بسازیم.'))),
    (11, 3, 8000, 12600, pg_temp.pc(
            pg_temp.sent(1, 'Let''s swim in the ocean.', 'بیا در اقیانوس شنا کنیم.'),
            pg_temp.sent(2, 'That''s a good idea.', 'این یک ایده خوب است.'))),
    (12, 3, 12600, 16000, pg_temp.pc(
            pg_temp.sent(1, 'Let''s find shells.', 'بیا صدف‌ها را پیدا کنیم.')));

-- یک عبارت حذف‌شده (soft delete) برای تست فیلتر deleted_at
insert into phrases (id, media_id, start_ms, end_ms, content, deleted_at)
    overriding system value
values (13, 3, 16000, 20000, pg_temp.pc(
        pg_temp.sent(1, 'Our hotel is really nice.', 'هتل ما واقعاً خوب است.')), now_ms());

select setval(pg_get_serial_sequence('phrases', 'id'), (select max(id) from phrases));