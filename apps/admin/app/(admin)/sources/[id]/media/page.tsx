import { MediaList } from "@/components/sources/media-list"
import { getSourceMedia } from "@/lib/data/sources"

export default async function SourceMediaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sourceId = Number(id)
    const items = await getSourceMedia(sourceId)

    return <MediaList sourceId={sourceId} items={items} />
}
