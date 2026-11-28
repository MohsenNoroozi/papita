import { notFound } from "next/navigation"

import { PhraseEditor } from "@/components/media/phrase-editor"
import { getMedia } from "@/lib/data/media"
import { createClient } from "@/lib/supabase/server"
import { MEDIA_BUCKET } from "@/lib/media"

type PhraseRecord = {
    id: number
    start_ms: number
    end_ms: number
    content: {
        version?: number
        sentences?: { id?: string; position?: number; text?: string; translations?: { fa?: string } }[]
    } | null
}

export default async function MediaSentencesPage({ params }: { params: Promise<{ id: string }> }) {
    const mediaId = Number((await params).id)
    if (!Number.isInteger(mediaId) || mediaId <= 0) notFound()

    const media = await getMedia(mediaId)
    if (!media) notFound()

    const supabase = await createClient()
    const [{ data: phraseData, error: phraseError }, file] = await Promise.all([
        supabase
            .from("phrases")
            .select("id, start_ms, end_ms, content")
            .eq("media_id", mediaId)
            .is("deleted_at", null)
            .order("start_ms", { ascending: true })
            .order("id", { ascending: true }),
        (async () => {
            if (!media.storagePath) return null
            if (/^https?:\/\//.test(media.storagePath)) return media.storagePath
            const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(media.storagePath, 3600)
            return data?.signedUrl ?? null
        })(),
    ])

    if (phraseError) {
        return <div dir="rtl" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">دریافت عبارت‌ها با خطا روبه‌رو شد. صفحه را تازه‌سازی کنید.</div>
    }

    const phrases = ((phraseData ?? []) as unknown as PhraseRecord[]).map((phrase) => ({
        id: phrase.id,
        startMs: Number(phrase.start_ms),
        endMs: Number(phrase.end_ms),
        sentences: (phrase.content?.sentences ?? [])
            .slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((sentence) => ({ en: sentence.text ?? "", fa: sentence.translations?.fa ?? "" })),
    }))

    return (
        <PhraseEditor
            mediaId={mediaId}
            mediaType={media.type}
            mediaUrl={file}
            phrases={phrases}
        />
    )
}
