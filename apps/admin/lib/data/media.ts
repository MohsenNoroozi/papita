import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { MediaType } from "@/lib/media"

export type MediaDetail = {
    id: number
    sourceId: number
    sourceTitle: string | null
    type: MediaType
    title: string | null
    description: string | null
    thumbnailPath: string | null
    storagePath: string | null
    position: number
}

type SourcePart = { title: string }
type MediaRecord = {
    id: number
    source_id: number
    type: MediaType
    title: string | null
    description: string | null
    thumbnail_url: string | null
    storage_path: string | null
    position: number
    sources: SourcePart | SourcePart[] | null
}

// cache: layout و page در یک درخواست فقط یک کوئری اجرا می‌کنند
export const getMedia = cache(async (id: number): Promise<MediaDetail | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("media")
        .select("id, source_id, type, title, description, thumbnail_url, storage_path, position, sources(title)")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return null

    const r = data as unknown as MediaRecord
    const source = Array.isArray(r.sources) ? r.sources[0] : r.sources
    return {
        id: r.id,
        sourceId: r.source_id,
        sourceTitle: source?.title ?? null,
        type: r.type,
        title: r.title,
        description: r.description,
        thumbnailPath: r.thumbnail_url,
        storagePath: r.storage_path,
        position: r.position,
    }
})
