export const AVATAR_BUCKET = "avatars"

const MARK = `/storage/v1/object/public/${AVATAR_BUCKET}/`

// مسیر داخل باکت؛ برای آدرس بیرونی (مثل pravatar) null
export function avatarPath(value: string | null | undefined): string | null {
    if (!value) return null
    const i = value.indexOf(MARK)
    if (i >= 0) {
        const raw = value.slice(i + MARK.length).split("?")[0]
        try {
            return decodeURIComponent(raw)
        } catch {
            return raw
        }
    }
    if (/^https?:\/\//.test(value)) return null
    return value
}

// آدرس قابل نمایش برای هر دو حالت (مسیر / آدرس کامل)
export function resolveAvatarUrl(value: string | null | undefined): string | null {
    if (!value) return null
    const path = avatarPath(value)
    if (!path) return value // آدرس خارجی

    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
    const encoded = path.split("/").map(encodeURIComponent).join("/")
    return `${base}${MARK}${encoded}`
}