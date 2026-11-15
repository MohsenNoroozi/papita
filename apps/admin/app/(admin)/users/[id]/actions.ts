"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAvailableWords, type AvailableWord } from "@/lib/data/users"
import { dueForBox, LEARNED_BOX, MIN_BOX } from "@/lib/leitner"
import { AVATAR_BUCKET, avatarPath } from "@/lib/avatar"
import { isUuid } from "@/lib/uuid"

export type ActionResult = { ok: true } | { ok: false; error: string }

const fail = (error: string): ActionResult => ({ ok: false, error })
const ok: ActionResult = { ok: true }
const GENERIC = "مشکلی پیش آمد؛ دوباره تلاش کنید"

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const toLatinDigits = (s: string) =>
    s
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?\d{7,15}$/
const AVATAR_MAX_BYTES = 1_000_000

const MAX_IDS = 5000 // سقف واژه در هر عملیات گروهی
const SELECT_CHUNK = 200 // طول لیست in(...) در کوئری (برای محدودیت طول URL)
const UPSERT_CHUNK = 500

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TEHRAN_OFFSET = "+03:30" // ایران ساعت تابستانی ندارد
export type DueResult = { ok: true; updated: number } | { ok: false; error: string }

type Supabase = Awaited<ReturnType<typeof createClient>>

function chunk<T>(items: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
        items.slice(i * size, (i + 1) * size)
    )
}

// فقط ادمینِ واردشده
async function requireAdmin() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "لطفاً دوباره وارد شوید" } as const
    if (user.app_metadata?.role !== "admin") return { error: "دسترسی لازم را ندارید" } as const
    return { supabase, user } as const
}

// تغییر در کاربر هم کارت عنوان (layout) و هم لیست را تازه می‌کند
function refresh(id: string) {
    revalidatePath(`/users/${id}`, "layout")
    revalidatePath("/users")
}

// ------------------------------------------------------------
// مشخصات
// ------------------------------------------------------------
export async function updateUserProfile(
    id: string,
    input: { fullname: string; email: string; phone: string; age: string; level: string }
): Promise<ActionResult> {
    if (!isUuid(id)) return fail("کاربر نامعتبر است")

    const fullname = text(input.fullname)
    const email = text(input.email).toLowerCase()
    const phone = toLatinDigits(text(input.phone)).replace(/[\s-]/g, "")
    const ageText = toLatinDigits(text(input.age))
    const level = Number(input.level)

    if (!fullname) return fail("نام نباید خالی باشد")
    if (fullname.length > 100) return fail("نام خیلی طولانی است")
    if (!EMAIL_RE.test(email)) return fail("ایمیل معتبر نیست")
    if (phone && !PHONE_RE.test(phone)) return fail("شماره تلفن معتبر نیست")
    if (!Number.isInteger(level) || level < 1 || level > 6) return fail("سطح نامعتبر است")

    let age: number | null = null
    if (ageText) {
        age = Number(ageText)
        if (!Number.isInteger(age) || age < 1 || age > 120) return fail("سن معتبر نیست")
    }

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const { data: current } = await supabase
        .from("profiles")
        .select("email, fullname")
        .eq("id", id)
        .maybeSingle()
    if (!current) return fail("کاربر پیدا نشد")

    const emailChanged = current.email.toLowerCase() !== email
    const nameChanged = current.fullname !== fullname
    const admin = createAdminClient()

    // ایمیل و نام در auth.users هم باید همگام بماند
    if (emailChanged || nameChanged) {
        const { error } = await admin.auth.admin.updateUserById(id, {
            ...(emailChanged ? { email, email_confirm: true } : {}),
            user_metadata: { full_name: fullname },
        })
        if (error) {
            if (error.code === "email_exists") return fail("این ایمیل قبلاً ثبت شده است")
            return fail(GENERIC)
        }
    }

    const { data, error } = await supabase
        .from("profiles")
        .update({ fullname, email, phone: phone || null, age, level })
        .eq("id", id)
        .select("id")

    if (error || !data?.length) {
        // برگرداندن ایمیل تا auth و profiles ناهمگام نمانند
        if (emailChanged) {
            await admin.auth.admin.updateUserById(id, { email: current.email, email_confirm: true })
        }
        if (error?.code === "23505") return fail("این ایمیل قبلاً ثبت شده است")
        return fail(error ? GENERIC : "دسترسی لازم را ندارید")
    }

    refresh(id)
    return ok
}

export async function changeUserPassword(id: string, password: string): Promise<ActionResult> {
    if (!isUuid(id)) return fail("کاربر نامعتبر است")
    if (typeof password !== "string" || password.length < 8) {
        return fail("رمز عبور باید حداقل ۸ کاراکتر باشد")
    }

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)

    const { error } = await createAdminClient().auth.admin.updateUserById(id, { password })
    if (error) {
        if (error.code === "weak_password") return fail("رمز عبور ضعیف است")
        return fail(GENERIC)
    }
    return ok
}

// عمداً صفحهٔ خودِ کاربر revalidate نمی‌شود؛ وگرنه قبل از navigate، notFound() می‌شود
export async function deleteUser(id: string): Promise<ActionResult> {
    if (!isUuid(id)) return fail("کاربر نامعتبر است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    if (auth.user.id === id) return fail("نمی‌توانید حساب خودتان را حذف کنید")

    const admin = createAdminClient()
    const { data: profile } = await admin.from("profiles").select("avatar_url").eq("id", id).maybeSingle()

    // profiles و user_progress با on delete cascade پاک می‌شوند
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) return fail(GENERIC)

    const path = avatarPath(profile?.avatar_url ?? null)
    if (path && path.startsWith(`${id}/`)) await admin.storage.from(AVATAR_BUCKET).remove([path])

    revalidatePath("/users")
    return ok
}

// ------------------------------------------------------------
// آواتار
// ------------------------------------------------------------
export async function uploadAvatar(id: string, formData: FormData): Promise<ActionResult> {
    if (!isUuid(id)) return fail("کاربر نامعتبر است")

    const file = formData.get("file")
    if (!(file instanceof File)) return fail("فایلی انتخاب نشده است")
    if (file.type !== "image/jpeg") return fail("فرمت تصویر پشتیبانی نمی‌شود")
    if (file.size > AVATAR_MAX_BYTES) return fail("حجم تصویر زیاد است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const { data: current } = await supabase.from("profiles").select("avatar_url").eq("id", id).maybeSingle()
    if (!current) return fail("کاربر پیدا نشد")

    const admin = createAdminClient()
    // نام یکتا برای هر آپلود تا cache مرورگر/CDN تصویر قدیمی را نشان ندهد
    const path = `${id}/${Date.now()}.jpg`
    const { error: uploadError } = await admin.storage
        .from(AVATAR_BUCKET)
        .upload(path, Buffer.from(await file.arrayBuffer()), {
            contentType: "image/jpeg",
            cacheControl: "31536000",
        })
    if (uploadError) return fail(GENERIC)

    // فقط مسیر ذخیره می‌شود (هم‌راستا با اپ موبایل)
    const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", id)
        .select("id")
    if (error || !data?.length) {
        await admin.storage.from(AVATAR_BUCKET).remove([path])
        return fail(error ? GENERIC : "دسترسی لازم را ندارید")
    }

    const oldPath = avatarPath(current.avatar_url)
    if (oldPath && oldPath !== path && oldPath.startsWith(`${id}/`)) {
        await admin.storage.from(AVATAR_BUCKET).remove([oldPath])
    }

    refresh(id)
    return ok
}

export async function removeAvatar(id: string): Promise<ActionResult> {
    if (!isUuid(id)) return fail("کاربر نامعتبر است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const { data: current } = await supabase.from("profiles").select("avatar_url").eq("id", id).maybeSingle()
    if (!current) return fail("کاربر پیدا نشد")

    const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", id)
        .select("id")
    if (error) return fail(GENERIC)
    if (!data?.length) return fail("دسترسی لازم را ندارید")

    const path = avatarPath(current.avatar_url)
    if (path && path.startsWith(`${id}/`)) {
        await createAdminClient().storage.from(AVATAR_BUCKET).remove([path])
    }

    refresh(id)
    return ok
}

// ------------------------------------------------------------
// پیشرفت (جعبه‌های Leitner)
// ------------------------------------------------------------

// ثبت جعبهٔ جدید برای چند واژه با یک upsert (هم ردیف موجود را به‌روز می‌کند،
// هم واژه‌ای را که در پیشرفت نیست اضافه می‌کند، هم ردیف soft-delete شده را زنده می‌کند).
// due و client_updated_ms هم بازمحاسبه می‌شوند تا تغییر ادمین در sync اپ (last-write-wins) برنده شود.
async function upsertBoxes(
    supabase: Supabase,
    userId: string,
    updates: { wordId: number; box: number }[]
): Promise<ActionResult> {
    const now = Date.now()
    const dues = new Map<number, string | null>()
    const dueOf = (box: number) => {
        if (!dues.has(box)) dues.set(box, dueForBox(box)?.toISOString() ?? null)
        return dues.get(box) ?? null
    }

    const rows = updates.map((u) => ({
        user_id: userId,
        word_id: u.wordId,
        box: u.box,
        due: dueOf(u.box),
        client_updated_ms: now,
        deleted: false,
    }))

    for (const part of chunk(rows, UPSERT_CHUNK)) {
        const { error } = await supabase.from("user_progress").upsert(part, { onConflict: "user_id,word_id" })
        if (error) {
            if (error.code === "42501") return fail("دسترسی لازم را ندارید")
            if (error.code === "23503") return fail("واژهٔ نامعتبری در انتخاب وجود دارد")
            return fail(GENERIC)
        }
    }
    return ok
}

function cleanIds(v: unknown): number[] | null {
    if (!Array.isArray(v) || v.length === 0 || v.length > MAX_IDS) return null
    const ids = Array.from(new Set(v as unknown[]))
    return ids.every((n): n is number => typeof n === "number" && Number.isInteger(n) && n > 0) ? ids : null
}

// delta = +1 پیشرفت بیشتر، -1 پیشرفت کمتر (برای یک واژه)
export async function changeProgressBox(
    userId: string,
    wordId: number,
    delta: 1 | -1
): Promise<ActionResult> {
    if (!isUuid(userId) || !Number.isInteger(wordId)) return fail("درخواست نامعتبر است")
    if (delta !== 1 && delta !== -1) return fail("درخواست نامعتبر است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const { data: current } = await supabase
        .from("user_progress")
        .select("box")
        .eq("user_id", userId)
        .eq("word_id", wordId)
        .eq("deleted", false)
        .maybeSingle()
    if (!current || current.box == null) return fail("این واژه در پیشرفت کاربر نیست")

    const box = Math.min(LEARNED_BOX, Math.max(MIN_BOX, current.box + delta))
    if (box === current.box) return ok

    const res = await upsertBoxes(supabase, userId, [{ wordId, box }])
    if (res.ok) revalidatePath(`/users/${userId}/progress`)
    return res
}

// یک جعبه جلو/عقب برای چند واژه؛ هر واژه از جعبهٔ فعلی خودش حساب می‌شود
export async function shiftProgressBoxes(
    userId: string,
    wordIds: number[],
    delta: 1 | -1
): Promise<ActionResult> {
    const ids = cleanIds(wordIds)
    if (!isUuid(userId) || !ids || (delta !== 1 && delta !== -1)) return fail("درخواست نامعتبر است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const current = new Map<number, number>()
    for (const part of chunk(ids, SELECT_CHUNK)) {
        const { data, error } = await supabase
            .from("user_progress")
            .select("word_id, box")
            .eq("user_id", userId)
            .eq("deleted", false)
            .in("word_id", part)
        if (error) return fail(GENERIC)
        for (const r of data ?? []) if (r.box != null) current.set(r.word_id, r.box)
    }

    const updates: { wordId: number; box: number }[] = []
    current.forEach((box, wordId) => {
        const next = Math.min(LEARNED_BOX, Math.max(MIN_BOX, box + delta))
        if (next !== box) updates.push({ wordId, box: next })
    })
    if (!updates.length) return ok

    const res = await upsertBoxes(supabase, userId, updates)
    if (res.ok) revalidatePath(`/users/${userId}/progress`)
    return res
}

// انتقال چند واژه به یک جعبهٔ مشخص؛ برای واژه‌های خارج از پیشرفت = افزودن به آن جعبه
export async function setProgressBoxes(
    userId: string,
    wordIds: number[],
    box: number
): Promise<ActionResult> {
    const ids = cleanIds(wordIds)
    if (!isUuid(userId) || !ids) return fail("درخواست نامعتبر است")
    if (!Number.isInteger(box) || box < MIN_BOX || box > LEARNED_BOX) return fail("جعبه نامعتبر است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)

    const res = await upsertBoxes(
        auth.supabase,
        userId,
        ids.map((wordId) => ({ wordId, box }))
    )
    if (res.ok) revalidatePath(`/users/${userId}/progress`)
    return res
}

// تغییر تاریخ سررسید چند واژه. date به‌صورت YYYY-MM-DD و به وقت تهران است.
// واژه‌های «یادگرفته‌شده» due ندارند (null = کاملاً یادگرفته)، پس نادیده گرفته می‌شوند.
export async function setProgressDue(
    userId: string,
    wordIds: number[],
    date: string
): Promise<DueResult> {
    const invalid = { ok: false, error: "درخواست نامعتبر است" } as const
    const ids = cleanIds(wordIds)
    if (!isUuid(userId) || !ids || typeof date !== "string" || !DATE_RE.test(date)) return invalid

    const [y, m, d] = date.split("-").map(Number)
    const check = new Date(Date.UTC(y, m - 1, d))
    // رد تاریخ‌های ناموجود مثل 2026-02-30
    if (check.getUTCMonth() !== m - 1 || y < 2000 || y > 2100) {
        return { ok: false, error: "تاریخ نامعتبر است" }
    }
    const due = new Date(`${date}T00:00:00${TEHRAN_OFFSET}`).toISOString()

    const auth = await requireAdmin()
    if ("error" in auth) return { ok: false, error: auth.error }

    // client_updated_ms هم به‌روز می‌شود تا تغییر ادمین در sync اپ (last-write-wins) برنده شود
    const now = Date.now()
    let updated = 0
    for (const part of chunk(ids, SELECT_CHUNK)) {
        const { data, error } = await auth.supabase
            .from("user_progress")
            .update({ due, client_updated_ms: now })
            .eq("user_id", userId)
            .eq("deleted", false)
            .lt("box", LEARNED_BOX)
            .in("word_id", part)
            .select("word_id")
        if (error) {
            return { ok: false, error: error.code === "42501" ? "دسترسی لازم را ندارید" : GENERIC }
        }
        updated += data?.length ?? 0
    }

    revalidatePath(`/users/${userId}/progress`)
    return { ok: true, updated }
}

// حذف واژه از پیشرفت (soft delete؛ مطابق قرارداد sync: box = null)
export async function removeProgress(userId: string, wordId: number): Promise<ActionResult> {
    if (!isUuid(userId) || !Number.isInteger(wordId)) return fail("درخواست نامعتبر است")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)

    const { data, error } = await auth.supabase
        .from("user_progress")
        .update({ deleted: true, box: null, due: null, client_updated_ms: Date.now() })
        .eq("user_id", userId)
        .eq("word_id", wordId)
        .select("word_id")
    if (error) return fail(GENERIC)
    if (!data?.length) return fail("دسترسی لازم را ندارید")

    revalidatePath(`/users/${userId}/progress`)
    return ok
}

// لیست واژه‌هایی که در هیچ جعبهٔ این کاربر نیستند (با باز شدن دیالوگ افزودن لود می‌شود)
export async function loadAvailableWords(
    userId: string
): Promise<{ ok: true; words: AvailableWord[] } | { ok: false; error: string }> {
    if (!isUuid(userId)) return { ok: false, error: "کاربر نامعتبر است" }

    const auth = await requireAdmin()
    if ("error" in auth) return { ok: false, error: auth.error }

    try {
        return { ok: true, words: await getAvailableWords(userId) }
    } catch {
        return { ok: false, error: GENERIC }
    }
}