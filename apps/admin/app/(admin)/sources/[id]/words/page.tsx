import { getSourceWords } from "@/lib/data/sources"
import { SourceWordsTable } from "@/components/sources/source-words-table"

export default async function SourceWordsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const sourceId = Number(id)
    const rows = await getSourceWords(sourceId)

    return <SourceWordsTable sourceId={sourceId} rows={rows} />
}
