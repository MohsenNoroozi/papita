import { notFound } from "next/navigation"
import { getCollections, getSource } from "@/lib/data/sources"
import { SourceSettingsForm } from "@/components/sources/source-settings-form"
import { DeleteSourceButton } from "@/components/sources/delete-source-button"

export default async function SourceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sourceId = Number(id)

    const [source, collections] = await Promise.all([getSource(sourceId), getCollections()])
    if (!source) notFound()

    return (
        <div className="space-y-4">
            <SourceSettingsForm
                source={{ id: source.id, title: source.title, collectionId: source.collectionId }}
                collections={collections}
            />
            <DeleteSourceButton sourceId={source.id} title={source.title} />
        </div>
    )
}
