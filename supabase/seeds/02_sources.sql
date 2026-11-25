insert into sources (id, title, collection_id, position) overriding system value
values (14, '14 - Action Boy can run!', 1, 4),
       (15, '15 - Let''s play ball!', 1, 5),
       (16, '13 - Clean up!', 1, 3),
       (49, '12 - Dinnertime!', 1, 2),
       (50, '11 - I like monkeys!', 1, 1)
;

select setval(pg_get_serial_sequence('sources', 'id'), (select max(id) from sources));