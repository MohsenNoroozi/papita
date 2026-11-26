export const MEDIA_BUCKET = "media"

export const MEDIA_TYPES = ["video", "audio"] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
    video: "ویدیو",
    audio: "صدا",
}

export const MEDIA_FILE_MAX_BYTES = 500 * 1024 * 1024
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024
export const THUMBNAIL_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function mediaTypeFromMime(mime: string): MediaType | null {
    if (mime.startsWith("video/")) return "video"
    if (mime.startsWith("audio/")) return "audio"
    return null
}

export const isMediaType = (v: unknown): v is MediaType =>
    typeof v === "string" && (MEDIA_TYPES as readonly string[]).includes(v)

// مسیر داخل باکت (یا آدرس کامل خارجی) → آدرس قابل نمایش
export function mediaPublicUrl(value: string | null | undefined): string | null {
    if (!value) return null
    if (/^https?:\/\//.test(value)) return value
    const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "")
    const encoded = value.split("/").map(encodeURIComponent).join("/")
    return `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`
}