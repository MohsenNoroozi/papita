"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { MAX_IMPORT_ROWS, type ImportReport, type ImportRowInput } from "@/lib/import-words"

export type ActionResult = { ok: true } | { ok: false; error: string }

const fail = (error: string): ActionResult => ({ ok: false, error })
const ok: ActionResult = { ok: true }
const GENERIC = "مشکلی پیش آمد؛ دوباره تلاش کنید"

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const nullable = (v: unknown) => text(v) || null
const level = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 6 ? n : null
}

function mapError(error: { code?: string }): string {
  if (error.code === "23505") return "این واژه (با همین زمینه) قبلاً ثبت شده است"
  if (error.code === "42501") return "دسترسی لازم را ندارید"
  if (error.code === "P0002") return "منبع پیدا نشد"
  return GENERIC
}

async function authed() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user ? supabase : null
}

// تغییر در منبع هم هدر (تعداد واژه) و هم لیست منابع را تازه می‌کند
function refresh(sourceId: number) {
  revalidatePath(`/sources/${sourceId}`, "layout")
  revalidatePath("/sources")
}

export async function updateSource(
  id: number,
  input: { title: string; collectionId: number }
): Promise<ActionResult> {
  const title = text(input.title)
  if (!title) return fail("عنوان منبع نباید خالی باشد")
  if (!Number.isInteger(input.collectionId)) return fail("collection را انتخاب کنید")

  const supabase = await authed()
  if (!supabase) return fail("لطفاً دوباره وارد شوید")

  const { data, error } = await supabase
    .from("sources")
    .update({ title, collection_id: input.collectionId })
    .eq("id", id)
    .select("id")
  if (error) return fail(mapError(error))
  if (!data?.length) return fail("دسترسی لازم را ندارید")

  refresh(id)
  return ok
}

// عمداً revalidate صفحهٔ خودِ منبع انجام نمی‌شود؛ وگرنه قبل از navigate، notFound() می‌شود
export async function deleteSource(id: number): Promise<ActionResult> {
  const supabase = await authed()
  if (!supabase) return fail("لطفاً دوباره وارد شوید")

  const { error } = await supabase.rpc("delete_source", { p_id: id })
  if (error) return fail(mapError(error))

  revalidatePath("/sources")
  return ok
}

export async function addWord(
  sourceId: number,
  input: { en: string; fa: string; level: string; sense: string; example: string; exampleFa: string }
): Promise<ActionResult> {
  const en = text(input.en)
  const fa = text(input.fa)
  const lvl = level(input.level)
  if (!en || !fa) return fail("واژه انگلیسی و ترجمه الزامی است")
  if (!lvl) return fail("سطح نامعتبر است")

  const supabase = await authed()
  if (!supabase) return fail("لطفاً دوباره وارد شوید")

  const { error } = await supabase.rpc("add_source_word", {
    p_source_id: sourceId,
    p_en: en,
    p_fa: fa,
    p_level: lvl,
    p_sense: nullable(input.sense),
    p_example: nullable(input.example),
    p_example_fa: nullable(input.exampleFa),
  })
  if (error) return fail(mapError(error))

  refresh(sourceId)
  return ok
}

// en / fa / sense / level روی خودِ واژه (مشترک بین منابع) اعمال می‌شود
export async function updateWord(
  sourceId: number,
  wordId: number,
  patch: Partial<{ en: string; fa: string; sense: string; level: string }>
): Promise<ActionResult> {
  const update: Record<string, unknown> = {}
  if ("en" in patch) {
    if (!text(patch.en)) return fail("واژه انگلیسی نباید خالی باشد")
    update.en = text(patch.en)
  }
  if ("fa" in patch) {
    if (!text(patch.fa)) return fail("ترجمه نباید خالی باشد")
    update.fa = text(patch.fa)
  }
  if ("sense" in patch) update.sense = nullable(patch.sense)
  if ("level" in patch) {
    const lvl = level(patch.level)
    if (!lvl) return fail("سطح نامعتبر است")
    update.level = lvl
  }
  if (!Object.keys(update).length) return ok

  const supabase = await authed()
  if (!supabase) return fail("لطفاً دوباره وارد شوید")

  const { data, error } = await supabase.from("words").update(update).eq("id", wordId).select("id")
  if (error) return fail(mapError(error))
  if (!data?.length) return fail("دسترسی لازم را ندارید")

  refresh(sourceId)
  return ok
}

// مثال مخصوص همین منبع است (source_words)
export async function updateExample(
  sourceId: number,
  wordId: number,
  input: { example: string; exampleFa: string }
): Promise<ActionResult> {
  const supabase = await authed()
  if (!supabase) return fail("لطفاً دوباره وارد شوید")

  const { data, error } = await supabase
    .from("source_words")
    .update({ example: nullable(input.example), example_fa: nullable(input.exampleFa) })
    .eq("source_id", sourceId)
    .eq("word_id", wordId)
    .select("word_id")
  if (error) return fail(mapError(error))
  if (!data?.length) return fail("دسترسی لازم را ندارید")

  refresh(sourceId)
  return ok
}

// حذف واژه از منبع (soft delete روی source_words؛ خودِ واژه باقی می‌ماند)
export async function removeWord(sourceId: number, wordId: number): Promise<ActionResult> {
  const supabase = await authed()
  if (!supabase) return fail("لطفاً دوباره وارد شوید")

  const { data, error } = await supabase
    .from("source_words")
    .update({ deleted: true })
    .eq("source_id", sourceId)
    .eq("word_id", wordId)
    .select("word_id")
  if (error) return fail(mapError(error))
  if (!data?.length) return fail("دسترسی لازم را ندارید")

  refresh(sourceId)
  return ok
}

export type ImportResult = { ok: true; report: ImportReport } | { ok: false; error: string }

const LEVEL_LABELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
const cell = (v: unknown) => (typeof v === "number" ? String(v) : text(v))

// A1..C2 یا ۱..۶ (با ارقام فارسی هم)
function parseLevel(v: unknown) {
  const s = cell(v)
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .toUpperCase()
  const i = LEVEL_LABELS.indexOf(s)
  return i >= 0 ? i + 1 : level(s)
}

export async function importWords(sourceId: number, rows: ImportRowInput[]): Promise<ImportResult> {
  if (!Number.isInteger(sourceId) || !Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "فایل ردیفی برای ایمپورت ندارد" }
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `حداکثر ${MAX_IMPORT_ROWS} ردیف در هر بار ایمپورت مجاز است` }
  }

  const valid: Record<string, unknown>[] = []
  const invalid: ImportReport["invalid"] = []

  for (const r of rows) {
    const en = cell(r.en)
    const fa = cell(r.fa)
    const lvl = parseLevel(r.level)
    if (!en || !fa) invalid.push({ row: r.row, reason: "واژه انگلیسی یا ترجمه خالی است" })
    else if (!lvl) invalid.push({ row: r.row, reason: "سطح نامعتبر است" })
    else {
      valid.push({
        en,
        fa,
        level: lvl,
        sense: cell(r.sense),
        example: cell(r.example),
        example_fa: cell(r.exampleFa),
      })
    }
  }

  const supabase = await authed()
  if (!supabase) return { ok: false, error: "لطفاً دوباره وارد شوید" }

  let imported = 0
  let skipped = 0
  if (valid.length) {
    const { data, error } = await supabase.rpc("import_source_words", {
      p_source_id: sourceId,
      p_rows: valid,
    })
    if (error) return { ok: false, error: mapError(error) }
    const res = data as { imported: number; skipped: number }
    imported = res.imported
    skipped = res.skipped
    refresh(sourceId)
  }

  return {
    ok: true,
    report: { imported, skipped, invalid: invalid.slice(0, 50), invalidCount: invalid.length },
  }
}
