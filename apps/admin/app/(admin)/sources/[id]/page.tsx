import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function SourcePage({
                                             params,
                                         }: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const sourceId = Number(id)
    if (!Number.isInteger(sourceId)) notFound()

    const supabase = await createClient()
    const { data: source } = await supabase
        .from("sources")
        .select("id, title")
        .eq("id", sourceId)
        .eq("deleted", false)
        .maybeSingle()

    if (!source) notFound()

    return (
        <div className="space-y-4 p-6">
            <Link href="/sources" className="text-sm text-muted-foreground hover:underline">
                ← بازگشت به منابع
            </Link>
            <h1 className="text-2xl font-bold">{source.title}</h1>
        </div>
    )
}