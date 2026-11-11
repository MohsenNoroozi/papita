insert into collections (id, title) overriding system value
values (1, 'Family and Friends 1');

select setval(pg_get_serial_sequence('collections', 'id'), (select max(id) from collections));