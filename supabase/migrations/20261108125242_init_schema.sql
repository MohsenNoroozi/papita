-- تابع به‌روزرسانی updated_at (برای همگام‌سازی delta)
create function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table sources (
                         id bigint primary key generated always as identity,
                         title text not null,
                         collection_id bigint,
                         position int not null default 0,
                         deleted boolean not null default false,
                         updated_at timestamptz not null default now()
);

create table words (
                       id bigint primary key generated always as identity,
                       en text not null,
                       sense text,
                       fa text not null,
                       level smallint not null default 1 check (level between 1 and 6),
                       deleted boolean not null default false,
                       updated_at timestamptz not null default now()
);
-- یک کلمه یکتا؛ فقط بین ردیف‌های فعال
create unique index words_en_sense_uq
    on words (lower(en), coalesce(sense, '')) where not deleted;

create table source_words (
                              source_id bigint references sources(id),
                              word_id bigint references words(id),
                              position int not null default 0,
                              example text,
                              example_fa text,
                              deleted boolean not null default false,
                              updated_at timestamptz not null default now(),
                              primary key (source_id, word_id)
);

create table profiles (
                          id uuid primary key references auth.users(id) on delete cascade,
                          level smallint not null default 1 check (level between 1 and 6),
                          settings jsonb not null default '{}'
);

create table user_progress (
                               user_id uuid references auth.users(id) on delete cascade,
                               word_id bigint references words(id),
                               box smallint not null,
                               due timestamptz,
                               updated_at timestamptz not null default now(),
                               primary key (user_id, word_id)
);

-- trigger برای updated_at روی جدول‌های محتوا و پیشرفت
create trigger t_sources before update on sources for each row execute function set_updated_at();
create trigger t_words before update on words for each row execute function set_updated_at();
create trigger t_sw before update on source_words for each row execute function set_updated_at();
create trigger t_up before update on user_progress for each row execute function set_updated_at();

-- امنیت
alter table sources enable row level security;
alter table words enable row level security;
alter table source_words enable row level security;
alter table profiles enable row level security;
alter table user_progress enable row level security;

create function is_admin() returns boolean language sql stable as $$
select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
           $$;

-- محتوا: همه بخوانند، فقط ادمین بنویسد
create policy read_all on sources for select using (true);
create policy read_all on words for select using (true);
create policy read_all on source_words for select using (true);
create policy admin_write on sources for all using (is_admin()) with check (is_admin());
create policy admin_write on words for all using (is_admin()) with check (is_admin());
create policy admin_write on source_words for all using (is_admin()) with check (is_admin());

-- داده کاربر: هر کس فقط مال خودش
create policy own on profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy own on user_progress for all using (user_id = auth.uid()) with check (user_id = auth.uid());