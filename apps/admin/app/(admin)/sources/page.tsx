import { createClient } from "@/lib/supabase/server"
import { SourcesTable, type CollectionOption, type SourceRow } from "./sources-table"

export default async function SourcesPage() {
    const supabase = await createClient()

    const [sourcesRes, collectionsRes] = await Promise.all([
        supabase
            .from("sources")
            .select("id, title, collection_id, source_words(count)")
            .eq("deleted", false)
            .eq("source_words.deleted", false)
            .order("position")
            .order("id"),
        supabase.from("collections").select("id, title").eq("deleted", false).order("id"),
    ])

    if (sourcesRes.error) throw new Error(sourcesRes.error.message)
    if (collectionsRes.error) throw new Error(collectionsRes.error.message)

    const sources: SourceRow[] = sourcesRes.data.map((s) => ({
        id: s.id,
        title: s.title,
        collectionId: s.collection_id,
        wordCount: s.source_words?.[0]?.count ?? 0,
    }))

    const collections: CollectionOption[] = collectionsRes.data

    return (
        <div className="p-1">
            <SourcesTable sources={sources} collections={collections} />
        </div>
    )
}