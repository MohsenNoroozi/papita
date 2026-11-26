import { notFound } from "next/navigation"

import { MediaDetailsForm } from "@/components/media/media-details-form"
import { MediaUploadBox } from "@/components/media/media-upload-box"
import { MediaThumbnailBox } from "@/components/media/media-thumbnail-box"
import { getMedia } from "@/lib/data/media"
import { createClient } from "@/lib/supabase/server"
import { MEDIA_BUCKET } from "@/lib/media"

const SIGNED_URL_TTL_SECONDS = 60 * 60

async function mediaUrl(path: string | null): Promise<string | null> {
    if (!path) return null
    // Older records may contain an external URL; Storage paths are signed because
    // the media bucket is private.
    if (/^https?:\/\//.test(path)) return path

    const supabase = await createClient()
    const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
    if (error) return ""
    return data.signedUrl
}

export default async function MediaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const mediaId = Number((await params).id)
    if (!Number.isInteger(mediaId) || mediaId <= 0) notFound()

    const media = await getMedia(mediaId)
    if (!media) notFound()

    const [fileUrl, thumbnailUrl] = await Promise.all([
        mediaUrl(media.storagePath),
        mediaUrl(media.thumbnailPath),
    ])

    return (
        <div dir="rtl" className="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
            <div className="grid min-w-0 gap-4">
                <MediaUploadBox mediaId={media.id} type={media.type} fileUrl={fileUrl} />
                <MediaThumbnailBox mediaId={media.id} thumbnailUrl={thumbnailUrl} />
            </div>
            <MediaDetailsForm
                media={{
                    id: media.id,
                    type: media.type,
                    title: media.title,
                    description: media.description,
                    position: media.position,
                }}
            />
        </div>
    )
}
