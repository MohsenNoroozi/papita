"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

type CreateUserResult =
    | { ok: true; id: string; fullname: string }
    | { ok: false; error: string }

const fail = (error: string): CreateUserResult => ({ ok: false, error })
const GENERIC = "مشکلی پیش آمد؛ دوباره تلاش کنید"

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "")

// ارقام فارسی/عربی → لاتین
const toLatinDigits = (s: string) =>
    s
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?\d{7,15}$/

export async function createUser(input: {
    fullname: string
    email: string
    password: string
    phone: string
    age: string
    avatarUrl: string
}): Promise<CreateUserResult> {
    const fullname = text(input.fullname)
    const email = text(input.email).toLowerCase()
    const password = typeof input.password === "string" ? input.password : ""
    const phone = toLatinDigits(text(input.phone)).replace(/[\s-]/g, "")
    const ageText = toLatinDigits(text(input.age))
    const avatarUrl = text(input.avatarUrl)

    if (!fullname) return fail("نام را وارد کنید")
    if (fullname.length > 100) return fail("نام خیلی طولانی است")
    if (!EMAIL_RE.test(email)) return fail("ایمیل معتبر نیست")
    if (password.length < 8) return fail("رمز عبور باید حداقل ۸ کاراکتر باشد")
    if (phone && !PHONE_RE.test(phone)) return fail("شماره تلفن معتبر نیست")

    let age: number | null = null
    if (ageText) {
        age = Number(ageText)
        if (!Number.isInteger(age) || age < 1 || age > 120) return fail("سن معتبر نیست")
    }

    if (avatarUrl) {
        try {
            const { protocol } = new URL(avatarUrl)
            if (protocol !== "http:" && protocol !== "https:") throw new Error()
        } catch {
            return fail("آدرس آواتار معتبر نیست")
        }
    }

    // فقط ادمین
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("ابتدا وارد شوید")
    if (user.app_metadata?.role !== "admin") return fail("شما دسترسی افزودن کاربر را ندارید")

    const admin = createAdminClient()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullname },
    })
    if (createError || !created.user) {
        if (createError?.code === "email_exists") return fail("این ایمیل قبلاً ثبت شده است")
        if (createError?.code === "weak_password") return fail("رمز عبور ضعیف است")
        return fail(GENERIC)
    }

    // پروفایل را trigger ساخته است (نام کامل و ایمیل)؛ بقیهٔ فیلدها اینجا تکمیل می‌شود
    const { error: profileError } = await admin
        .from("profiles")
        .update({ fullname, phone: phone || null, age, avatar_url: avatarUrl || null })
        .eq("id", created.user.id)

    if (profileError) {
        // جلوگیری از کاربر نیمه‌کاره
        await admin.auth.admin.deleteUser(created.user.id)
        return fail(GENERIC)
    }

    revalidatePath("/users")
    return { ok: true, id: created.user.id, fullname }
}