import { createClient } from "@/lib/supabase/server"
import { SourcesTable, type CollectionOption, type SourceRow } from "./sources-table"

export default async function SourcesPage() {
    const supabase = await createClient()

    const [sourcesRes, collectionsRes] = await Promise.all([
        supabase
            .from("sources")
            .select("id, title, collection_id, collections(title), source_words(count)")
            .eq("deleted", false)
            .eq("source_words.deleted", false) // فقط کلمه‌های حذف‌نشده شمرده شوند
            .order("id"),
        supabase.from("collections").select("id, title").eq("deleted", false).order("id"),
    ])

    if (sourcesRes.error) throw new Error(sourcesRes.error.message)
    if (collectionsRes.error) throw new Error(collectionsRes.error.message)

    const sources: SourceRow[] = sourcesRes.data.map((s) => {
        const collection = Array.isArray(s.collections) ? s.collections[0] : s.collections
        return {
            id: s.id,
            title: s.title,
            collectionTitle: collection?.title ?? "—",
            wordCount: s.source_words?.[0]?.count ?? 0,
        }
    })

    const collections: CollectionOption[] = collectionsRes.data

    return (
        <div className="space-y-6 p-1">
            <h1 className="text-2xl font-bold">منابع</h1>
            <SourcesTable sources={sources} collections={collections} />
        </div>
    )
}