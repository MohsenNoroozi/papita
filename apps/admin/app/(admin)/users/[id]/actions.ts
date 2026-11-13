"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { dueForBox, LEARNED_BOX, MIN_BOX } from "@/lib/leitner"
import { isUuid } from "@/lib/uuid"
import {SupabaseClient, User} from "@supabase/supabase-js";

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
const AVATAR_BUCKET = "avatars"
const AVATAR_MAX_BYTES = 1_000_000

// فقط ادمینِ واردشده
// type AdminAuthResult = | { ok: true; supabase: SupabaseClient; user: User } | { ok: false; error: string }
async function requireAdmin(): Promise<{ ok: true; supabase: SupabaseClient; user: User } | { ok: false; error: string }> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { ok: false, error: "لطفاً دوباره وارد شوید" }
    }

    if (user.app_metadata?.role !== "admin") {
        return { ok: false, error: "دسترسی لازم را ندارید" }
    }

    return { ok: true, supabase, user }
}

// مسیر فایل داخل bucket از روی آدرس عمومی (اگر آدرس خارجی باشد null)
function avatarPath(url: string | null): string | null {
    if (!url) return null
    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
    const i = url.indexOf(marker)
    if (i === -1) return null
    return decodeURIComponent(url.slice(i + marker.length).split("?")[0])
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
    if (path) await admin.storage.from(AVATAR_BUCKET).remove([path])

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

    const url = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
    const { data, error } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", id)
        .select("id")
    if (error || !data?.length) {
        await admin.storage.from(AVATAR_BUCKET).remove([path])
        return fail(error ? GENERIC : "دسترسی لازم را ندارید")
    }

    const oldPath = avatarPath(current.avatar_url)
    if (oldPath) await admin.storage.from(AVATAR_BUCKET).remove([oldPath])

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
    if (path) await createAdminClient().storage.from(AVATAR_BUCKET).remove([path])

    refresh(id)
    return ok
}

// ------------------------------------------------------------
// پیشرفت (جعبه‌های Leitner)
// ------------------------------------------------------------
// delta = +1 پیشرفت بیشتر، -1 پیشرفت کمتر. due و client_updated_ms هم بازمحاسبه می‌شوند
// تا تغییر ادمین در همگام‌سازی اپ (last-write-wins) برنده شود.
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

    const { data, error } = await supabase
        .from("user_progress")
        .update({
            box,
            due: dueForBox(box)?.toISOString() ?? null,
            client_updated_ms: Date.now(),
        })
        .eq("user_id", userId)
        .eq("word_id", wordId)
        .select("word_id")
    if (error) return fail(GENERIC)
    if (!data?.length) return fail("دسترسی لازم را ندارید")

    revalidatePath(`/users/${userId}/progress`)
    return ok
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