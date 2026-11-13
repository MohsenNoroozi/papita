-- ============================================================
-- Papita: schema اولیه
-- ============================================================

-- تابع به‌روزرسانی updated_at (برای همگام‌سازی delta)
create function set_updated_at() returns trigger
    language plpgsql as
$$
begin
    new.updated_at = now(); return new;
end
$$;

create table collections
(
    id         bigint primary key generated always as identity,
    title      text        not null,
    deleted    boolean     not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- محتوا (مشترک بین همه کاربران؛ حذف = soft delete با deleted=true)
-- ------------------------------------------------------------
create table sources
(
    id            bigint primary key generated always as identity,
    title         text        not null,
    collection_id bigint references collections (id),
    position      int         not null default 0,
    deleted       boolean     not null default false,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create table words
(
    id         bigint primary key generated always as identity,
    en         text        not null,
    fa         text        not null,
    level      smallint    not null default 1 check (level between 1 and 6),
    sense      text,
    deleted    boolean     not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint words_en_not_blank check (btrim(en) <> ''),
    constraint words_fa_not_blank check (btrim(fa) <> '')
);
-- یک کلمه یکتا؛ فقط بین ردیف‌های فعال
create unique index words_en_sense_uq
    on words (lower(en), coalesce(sense, '')) where not deleted;

create table source_words
(
    source_id  bigint      not null references sources (id),
    word_id    bigint      not null references words (id),
    position   int         not null default 0,
    example    text,
    example_fa text,
    deleted    boolean     not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (source_id, word_id)
);

-- ایندکس برای کوئری delta (updated_at > since) و جستجوی منبعِ یک کلمه
create index collections_updated_idx on collections (updated_at);
create index sources_collection_idx on sources (collection_id);
create index sources_updated_idx on sources (updated_at);
create index words_updated_idx on words (updated_at);
create index source_words_updated_idx on source_words (updated_at);
create index source_words_word_idx on source_words (word_id);

-- ------------------------------------------------------------
-- داده کاربر
-- ------------------------------------------------------------
create table profiles
(
    id         uuid primary key references auth.users (id) on delete cascade,
    fullname   text        not null,
    email      text        not null,
    phone      text,
    avatar_url text,
    age        smallint,
    level      smallint    not null default 1 check (level between 1 and 6),
    settings   jsonb       not null default '{}',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint profiles_fullname_not_blank check (btrim(fullname) <> ''),
    constraint profiles_email_not_blank check (btrim(email) <> ''),
    constraint profiles_age_range check (age is null or age between 1 and 120)
);
create unique index profiles_email_uq on profiles (lower(email));
create index profiles_created_idx on profiles (created_at);

create table user_progress
(
    user_id           uuid        not null references auth.users (id) on delete cascade,
    word_id           bigint      not null references words (id),
    box               smallint,                           -- برای ردیف حذف‌شده null است
    due               timestamptz,                        -- null = کاملاً یادگرفته
    client_updated_ms bigint      not null,               -- زمان آخرین تغییر در کلاینت (ms)، برای last-write-wins
    deleted           boolean     not null default false, -- کلمه از جعبه‌ها حذف شده
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now(),
    primary key (user_id, word_id),
    constraint box_required check (deleted or box is not null)
);
create index user_progress_sync_idx on user_progress (user_id, updated_at);

-- ------------------------------------------------------------
-- ساخت خودکار پروفایل
-- ------------------------------------------------------------

-- با ساخته شدن کاربر، پروفایل (با نام کامل و ایمیل) هم ساخته شود
create function handle_new_user() returns trigger
    language plpgsql
    security definer set search_path = public as
$$
begin
    insert into public.profiles (id, fullname, email)
    values (new.id,
            coalesce(
                    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
                    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
                    split_part(new.email, '@', 1)
            ),
            new.email)
    on conflict do nothing;
    return new;
end
$$;

-- اگر insertی نام/ایمیل نداد، از auth.users پر شود
-- (before-insert قبل از چک NOT NULL اجرا می‌شود)
create function fill_profile_identity() returns trigger
    language plpgsql
    security definer set search_path = public as
$$
declare
    v_email    text;
    v_fullname text;
begin
    if new.email is null or new.fullname is null then
        select u.email,
               coalesce(
                       nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
                       nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
                       split_part(u.email, '@', 1)
               )
        into v_email, v_fullname
        from auth.users u
        where u.id = new.id;

        new.email := coalesce(new.email, v_email);
        new.fullname := coalesce(new.fullname, v_fullname);
    end if;
    return new;
end
$$;

create trigger t_profiles_identity
    before insert
    on profiles
    for each row
execute function fill_profile_identity();

create trigger on_auth_user_created
    after insert
    on auth.users
    for each row
execute function handle_new_user();

-- کاربرانی که قبل از این migration ساخته شده‌اند (مثلاً ادمین)
insert into profiles (id)
select id
from auth.users
on conflict do nothing;

-- ------------------------------------------------------------
-- trigger برای updated_at
-- ------------------------------------------------------------
create trigger t_collections
    before update
    on collections
    for each row
execute function set_updated_at();
create trigger t_sources
    before update
    on sources
    for each row
execute function set_updated_at();
create trigger t_words
    before update
    on words
    for each row
execute function set_updated_at();
create trigger t_sw
    before update
    on source_words
    for each row
execute function set_updated_at();
create trigger t_profiles
    before update
    on profiles
    for each row
execute function set_updated_at();
create trigger t_up
    before update
    on user_progress
    for each row
execute function set_updated_at();

-- ------------------------------------------------------------
-- امنیت
-- ------------------------------------------------------------
alter table collections enable row level security;
alter table sources enable row level security;
alter table words enable row level security;
alter table source_words enable row level security;
alter table profiles enable row level security;
alter table user_progress enable row level security;

-- کاربر بدون ورود (anon) هیچ دسترسی مستقیمی به جدول‌ها ندارد
revoke all on collections, sources, words, source_words, profiles, user_progress from anon;

create function is_admin() returns boolean
    language sql
    stable as
$$
select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

-- محتوا: فقط کاربر واردشده بخواند (شامل ردیف‌های deleted تا اپ حذف را بفهمد)؛ فقط ادمین بنویسد
create policy read_authenticated on collections for select to authenticated using (true);
create policy read_authenticated on sources for select to authenticated using (true);
create policy read_authenticated on words for select to authenticated using (true);
create policy read_authenticated on source_words for select to authenticated using (true);

create policy admin_write on collections for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write on sources for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write on words for all to authenticated using (is_admin()) with check (is_admin());
create policy admin_write on source_words for all to authenticated using (is_admin()) with check (is_admin());

-- داده کاربر: هر کس فقط مال خودش
create policy own on profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy own on user_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ادمین همهٔ پروفایل‌ها را ببیند و ویرایش کند (policy «own» برای خود کاربر سر جایش می‌ماند)
create policy admin_all on profiles for all to authenticated
    using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- API همگام‌سازی (فقط authenticated؛ RLS هم اعمال می‌شود)
-- ------------------------------------------------------------

-- تغییرات کاتالوگ از زمان since به بعد
create function catalog_changes(since timestamptz)
    returns jsonb
    language sql
    stable security invoker as
$$
select jsonb_build_object(
               'collections', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'title', title,
                'updatedAt', updated_at,
                'deletedAt', case when deleted then updated_at end))
                                        from collections where updated_at > since), '[]'::jsonb),
               'sources', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'title', title, 'collectionId', collection_id, 'position', position,
                'updatedAt', updated_at,
                'deletedAt', case when deleted then updated_at end))
                                    from sources
                                    where updated_at > since), '[]'::jsonb),
               'words', coalesce((select jsonb_agg(jsonb_build_object(
                'id', id, 'en', en, 'sense', sense, 'fa', fa, 'level', level,
                'updatedAt', updated_at,
                'deletedAt', case when deleted then updated_at end))
                                  from words
                                  where updated_at > since), '[]'::jsonb),
               'sourceWords', coalesce((select jsonb_agg(jsonb_build_object(
                'sourceId', source_id, 'wordId', word_id, 'position', position,
                'example', example, 'exampleFa', example_fa,
                'updatedAt', updated_at,
                'deletedAt', case when deleted then updated_at end))
                                        from source_words
                                        where updated_at > since), '[]'::jsonb),
           -- ۵ ثانیه همپوشانی تا تراکنش‌های دیر commit‌شده از دست نروند (merge در اپ idempotent است)
               'nextSince', now() - interval '5 seconds'
       );
$$;

-- ارسال تغییرات پیشرفت کاربر + دریافت تغییرات سرور (last-write-wins با clientUpdatedMs)
-- due در اپ بر حسب ms است و اینجا به timestamptz تبدیل می‌شود
create function sync_progress(changes jsonb, since timestamptz)
    returns jsonb
    language plpgsql
    security invoker as
$$
begin
    insert into user_progress (user_id, word_id, box, due, client_updated_ms, deleted)
    select auth.uid(),
           (c ->> 'wordId')::bigint,
           (c ->> 'box')::smallint,
           case
               when c ->> 'due' is null then null
               else to_timestamp((c ->> 'due')::bigint / 1000.0) end,
           (c ->> 'clientUpdatedMs')::bigint,
           coalesce((c ->> 'deleted')::boolean, false)
    from jsonb_array_elements(changes) c
    on conflict (user_id, word_id) do update
        set box               = excluded.box,
            due               = excluded.due,
            client_updated_ms = excluded.client_updated_ms,
            deleted           = excluded.deleted
    where excluded.client_updated_ms > user_progress.client_updated_ms;

    return jsonb_build_object(
            'changes', coalesce((select jsonb_agg(jsonb_build_object(
                    'wordId', word_id, 'box', box,
                    'due', (extract(epoch from due) * 1000)::bigint,
                    'clientUpdatedMs', client_updated_ms, 'deleted', deleted))
                                 from user_progress
                                 where user_id = auth.uid()
                                   and updated_at > since), '[]'::jsonb),
            'nextSince', now() - interval '5 seconds'
           );
end
$$;

-- افزودن واژه به منبع به‌صورت اتمیک (استفاده مجدد از واژه موجود با همان en+sense)
create function add_source_word(
    p_source_id bigint, p_en text, p_fa text, p_level smallint,
    p_sense text, p_example text, p_example_fa text
) returns bigint language plpgsql security invoker as $$
declare
    v_word_id bigint;
    v_pos int;
begin
    if not is_admin() then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    select id into v_word_id from words
    where not deleted and lower(en) = lower(p_en) and coalesce(sense, '') = coalesce(p_sense, '');

    if v_word_id is null then
        insert into words (en, sense, fa, level)
        values (p_en, p_sense, p_fa, p_level) returning id into v_word_id;
    elsif exists (select 1 from source_words
                  where source_id = p_source_id and word_id = v_word_id and not deleted) then
        raise exception 'word already in source' using errcode = '23505';
    end if;

    select coalesce(max(position), 0) + 1 into v_pos
    from source_words where source_id = p_source_id and not deleted;

    insert into source_words (source_id, word_id, position, example, example_fa)
    values (p_source_id, v_word_id, v_pos, p_example, p_example_fa)
    on conflict (source_id, word_id) do update
        set deleted = false, position = excluded.position,
            example = excluded.example, example_fa = excluded.example_fa;

    return v_word_id;
end $$;

-- حذف نرم منبع + واژه‌های داخل آن (خودِ واژه‌ها حذف نمی‌شوند؛ ممکن است در منبع دیگری باشند)
create function delete_source(p_id bigint) returns void
    language plpgsql security invoker as $$
begin
    if not is_admin() then
        raise exception 'forbidden' using errcode = '42501';
    end if;
    update source_words set deleted = true where source_id = p_id and not deleted;
    update sources set deleted = true where id = p_id and not deleted;
end $$;

-- ترتیب منابع یک مجموعه؛ p_ids به ترتیب نمایش
create function reorder_sources(p_collection_id bigint, p_ids bigint[]) returns void
    language plpgsql security invoker as $$
begin
    if not is_admin() then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    update sources s
    set position = o.ord::int
    from unnest(p_ids) with ordinality as o(id, ord)
    where s.id = o.id and s.collection_id = p_collection_id;
end $$;

-- ایمپورت دسته‌ای واژه‌ها به یک منبع (اتمیک)
-- p_rows: [{en, fa, level, sense, example, example_fa}, ...] که قبلاً اعتبارسنجی شده‌اند
create function import_source_words(p_source_id bigint, p_rows jsonb) returns jsonb
    language plpgsql security invoker as $$
declare
    r          jsonb;
    v_word_id  bigint;
    v_sense    text;
    v_pos      int;
    v_imported int := 0;
    v_skipped  int := 0;
begin
    if not is_admin() then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    if not exists (select 1 from sources where id = p_source_id and not deleted) then
        raise exception 'source not found' using errcode = 'P0002';
    end if;

    select coalesce(max(position), 0) into v_pos
    from source_words where source_id = p_source_id and not deleted;

    for r in select * from jsonb_array_elements(p_rows)
        loop
            -- اگر en در این منبع هست (با هر sense)، نادیده بگیر؛ تکرارهای داخل فایل هم همین‌جا رد می‌شوند
            if exists (select 1
                       from source_words sw
                                join words w on w.id = sw.word_id
                       where sw.source_id = p_source_id
                         and not sw.deleted and not w.deleted
                         and lower(w.en) = lower(r ->> 'en')) then
                v_skipped := v_skipped + 1;
                continue;
            end if;

            v_sense := nullif(r ->> 'sense', '');

            select id into v_word_id from words
            where not deleted
              and lower(en) = lower(r ->> 'en')
              and coalesce(sense, '') = coalesce(v_sense, '');

            if v_word_id is null then
                insert into words (en, sense, fa, level)
                values (r ->> 'en', v_sense, r ->> 'fa', (r ->> 'level')::smallint)
                returning id into v_word_id;
            end if;

            v_pos := v_pos + 1;
            insert into source_words (source_id, word_id, position, example, example_fa)
            values (p_source_id, v_word_id, v_pos,
                    nullif(r ->> 'example', ''), nullif(r ->> 'example_fa', ''))
            on conflict (source_id, word_id) do update
                set deleted = false, position = excluded.position,
                    example = excluded.example, example_fa = excluded.example_fa;

            v_imported := v_imported + 1;
        end loop;

    return jsonb_build_object('imported', v_imported, 'skipped', v_skipped);
end $$;

revoke all on function catalog_changes(timestamptz) from public, anon;
revoke all on function sync_progress(jsonb, timestamptz) from public, anon;
grant execute on function catalog_changes(timestamptz) to authenticated;
grant execute on function sync_progress(jsonb, timestamptz) to authenticated;

revoke all on function add_source_word(bigint, text, text, smallint, text, text, text) from public, anon;
revoke all on function delete_source(bigint) from public, anon;
grant execute on function add_source_word(bigint, text, text, smallint, text, text, text) to authenticated;
grant execute on function delete_source(bigint) to authenticated;

revoke all on function reorder_sources(bigint, bigint[]) from public, anon;
grant execute on function reorder_sources(bigint, bigint[]) to authenticated;

revoke all on function import_source_words(bigint, jsonb) from public, anon;
grant execute on function import_source_words(bigint, jsonb) to authenticated;