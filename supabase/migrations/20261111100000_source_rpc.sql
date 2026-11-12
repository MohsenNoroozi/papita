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

revoke all on function add_source_word(bigint, text, text, smallint, text, text, text) from public, anon;
revoke all on function delete_source(bigint) from public, anon;
grant execute on function add_source_word(bigint, text, text, smallint, text, text, text) to authenticated;
grant execute on function delete_source(bigint) to authenticated;
