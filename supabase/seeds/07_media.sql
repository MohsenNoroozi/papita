-- مدیای نمونه برای منبع ۱۴ و ۱۵ (فایل‌ها واقعاً در Storage وجود ندارند؛ فقط مسیرهای نمونه‌اند)
insert into media (id, source_id, type, title, description, storage_path, thumbnail_url, position)
    overriding system value
values (1, 14, 'audio', 'Action Boy can run! - Audio', 'فایل صوتی درس ۱۴', 'sources/14/lesson-14.mp3', null, 1),
       (2, 14, 'video', 'Action Boy can run! - Video', 'ویدیوی آموزشی درس ۱۴', 'sources/14/lesson-14.mp4', 'sources/14/lesson-14.jpg', 2),
       (3, 15, 'audio', 'Let''s play ball! - Audio', 'فایل صوتی درس ۱۵', 'sources/15/lesson-15.mp3', null, 1);

select setval(pg_get_serial_sequence('media', 'id'), (select max(id) from media));