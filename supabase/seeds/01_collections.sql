insert into sources (id, title, collection_id, position) overriding system value
values (14, '14 - Action Boy can run!', 1, 1),
       (15, '15 - Let''s play ball!', 1, 2);

select setval(pg_get_serial_sequence('sources', 'id'), (select max(id) from sources));