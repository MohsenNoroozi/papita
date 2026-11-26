"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
    MEDIA_BUCKET,
    MEDIA_FILE_MAX_BYTES,
    THUMBNAIL_MAX_BYTES,
    THUMBNAIL_TYPES,
    isMediaType,
    mediaTypeFromMime,
} from "@/lib/media"

export type ActionResult = { ok: true } | { ok: false; error: string | undefined }
export type UploadTarget = { ok: true; path: string; token: string } | { ok: false; error: string | undefined }
export type UploadKind = "file" | "thumbnail"

const fail = (error: string): ActionResult => ({ ok: false, error })
const ok: ActionResult = { ok: true }
const GENERIC = "مشکلی پیش آمد؛ دوباره تلاش کنید"
const INVALID = "درخواست نامعتبر است"

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const nullable = (v: unknown) => text(v) || null
const toLatinDigits = (s: string) =>
    s
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))

const isId = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0
const isKind = (k: unknown): k is UploadKind => k === "file" || k === "thumbnail"

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

// تغییر در مدیا هم کارت عنوان (layout) و هم صفحه‌ها را تازه می‌کند
function refresh(id: number) {
    revalidatePath(`/media/${id}`, "layout")
}

function validateUpload(kind: UploadKind, type: string, size: number): string | null {
    if (!Number.isFinite(size) || size <= 0) return "فایل خالی است"
    if (kind === "file") {
        if (!mediaTypeFromMime(type)) return "فقط فایل صوتی یا ویدیویی مجاز است"
        if (size > MEDIA_FILE_MAX_BYTES) return "حجم فایل زیاد است"
    } else {
        if (!THUMBNAIL_TYPES.includes(type)) return "تصویر باید JPG، PNG یا WebP باشد"
        if (size > THUMBNAIL_MAX_BYTES) return "حجم تصویر زیاد است (حداکثر ۲ مگابایت)"
    }
    return null
}

function extensionOf(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? ""
    return /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin"
}

// مسیر فایل‌های هر مدیا زیر پوشهٔ <mediaId>/ است
const ownsPath = (mediaId: number, path: string) =>
    path.startsWith(`${mediaId}/`) && !path.includes("..")

async function removeObject(path: string | null | undefined, mediaId: number) {
    if (path && ownsPath(mediaId, path)) {
        await createAdminClient().storage.from(MEDIA_BUCKET).remove([path])
    }
}

// ------------------------------------------------------------
// آپلود: ۱) گرفتن signed URL  ۲) آپلود مستقیم از مرورگر  ۳) ثبت مسیر
// ------------------------------------------------------------
export async function createMediaUploadUrl(
    mediaId: number,
    kind: UploadKind,
    meta: { name: string; type: string; size: number }
): Promise<UploadTarget> {
    if (!isId(mediaId) || !isKind(kind)) return { ok: false, error: INVALID }

    const invalid = validateUpload(kind, text(meta?.type), Number(meta?.size))
    if (invalid) return { ok: false, error: invalid }

    const auth = await requireAdmin()
    if ("error" in auth) return { ok: false, error: auth.error }

    const { data: exists } = await auth.supabase
        .from("media")
        .select("id")
        .eq("id", mediaId)
        .is("deleted_at", null)
        .maybeSingle()
    if (!exists) return { ok: false, error: "مدیا پیدا نشد" }

    // نام یکتا برای هر آپلود تا cache مرورگر/CDN فایل قدیمی را نشان ندهد
    const path = `${mediaId}/${kind}-${Date.now()}.${extensionOf(text(meta.name))}`
    const { data, error } = await createAdminClient().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path)
    if (error || !data) return { ok: false, error: GENERIC }

    return { ok: true, path, token: data.token }
}

export async function commitMediaUpload(
    mediaId: number,
    kind: UploadKind,
    path: string,
    contentType: string
): Promise<ActionResult> {
    if (!isId(mediaId) || !isKind(kind) || typeof path !== "string" || !ownsPath(mediaId, path)) {
        return fail(INVALID)
    }
    const type = text(contentType)
    const invalid = validateUpload(kind, type, 1)
    if (invalid) return fail(invalid)

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth
    const admin = createAdminClient()

    // مطمئن شویم فایل واقعاً آپلود شده است
    const name = path.slice(`${mediaId}/`.length)
    const { data: files } = await admin.storage.from(MEDIA_BUCKET).list(String(mediaId), { search: name })
    if (!files?.some((f) => f.name === name)) return fail("فایل آپلود نشد؛ دوباره تلاش کنید")

    const { data: current } = await supabase
        .from("media")
        .select("storage_path, thumbnail_url")
        .eq("id", mediaId)
        .is("deleted_at", null)
        .maybeSingle()
    if (!current) {
        await removeObject(path, mediaId)
        return fail("مدیا پیدا نشد")
    }

    const patch =
        kind === "file"
            ? { storage_path: path, type: mediaTypeFromMime(type)! }
            : { thumbnail_url: path }

    const { data, error } = await supabase.from("media").update(patch).eq("id", mediaId).select("id")
    if (error || !data?.length) {
        await removeObject(path, mediaId)
        return fail(error ? GENERIC : "دسترسی لازم را ندارید")
    }

    await removeObject(kind === "file" ? current.storage_path : current.thumbnail_url, mediaId)

    refresh(mediaId)
    return ok
}

export async function removeThumbnail(mediaId: number): Promise<ActionResult> {
    if (!isId(mediaId)) return fail(INVALID)

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const { data: current } = await supabase
        .from("media")
        .select("thumbnail_url")
        .eq("id", mediaId)
        .is("deleted_at", null)
        .maybeSingle()
    if (!current) return fail("مدیا پیدا نشد")

    const { data, error } = await supabase
        .from("media")
        .update({ thumbnail_url: null })
        .eq("id", mediaId)
        .select("id")
    if (error) return fail(GENERIC)
    if (!data?.length) return fail("دسترسی لازم را ندارید")

    await removeObject(current.thumbnail_url, mediaId)

    refresh(mediaId)
    return ok
}

export async function removeMediaFile(mediaId: number): Promise<ActionResult> {
    if (!isId(mediaId)) return fail(INVALID)

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)
    const { supabase } = auth

    const { data: current } = await supabase
        .from("media")
        .select("storage_path")
        .eq("id", mediaId)
        .is("deleted_at", null)
        .maybeSingle()
    if (!current) return fail("مدیا پیدا نشد")

    const { data, error } = await supabase
        .from("media")
        .update({ storage_path: null })
        .eq("id", mediaId)
        .select("id")
    if (error) return fail(GENERIC)
    if (!data?.length) return fail("دسترسی لازم را ندارید")

    await removeObject(current.storage_path, mediaId)
    refresh(mediaId)
    return ok
}

// ------------------------------------------------------------
// مشخصات
// ------------------------------------------------------------
export async function updateMedia(
    mediaId: number,
    input: { type: string; title: string; description: string; position: string }
): Promise<ActionResult> {
    if (!isId(mediaId)) return fail(INVALID)

    const title = nullable(input.title)
    const description = nullable(input.description)
    const position = Number(toLatinDigits(text(input.position)))

    if (!isMediaType(input.type)) return fail("نوع مدیا نامعتبر است")
    if (title && title.length > 200) return fail("عنوان خیلی طولانی است")
    if (description && description.length > 2000) return fail("توضیحات خیلی طولانی است")
    if (!Number.isInteger(position) || position < 0) return fail("جایگاه باید عدد صحیح و صفر یا بزرگ‌تر باشد")

    const auth = await requireAdmin()
    if ("error" in auth) return fail(auth.error)

    const { data, error } = await auth.supabase
        .from("media")
        .update({ type: input.type, title, description, position })
        .eq("id", mediaId)
        .is("deleted_at", null)
        .select("id")
    if (error) return fail(GENERIC)
    if (!data?.length) return fail("دسترسی لازم را ندارید")

    refresh(mediaId)
    return ok
}
