import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type SourceDetail = {
  id: number
  title: string
  collectionId: number | null
  collectionTitle: string | null
  wordCount: number
}

export type CollectionOption = { id: number; title: string }

export type SourceWordRow = {
  wordId: number
  en: string
  fa: string
  sense: string | null
  level: number
  example: string | null
  exampleFa: string | null
  updatedAt: string // ISO؛ دیرتر از بین words و source_words
}

// cache() باعث می‌شود layout و page در یک درخواست فقط یک‌بار کوئری بزنند
export const getSource = cache(async (id: number): Promise<SourceDetail | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("sources")
    .select("id, title, collection_id, collections(id, title), source_words(count)")
    .eq("id", id)
    .eq("deleted", false)
    .eq("source_words.deleted", false)
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as {
    id: number
    title: string
    collection_id: number | null
    collections: { id: number; title: string } | { id: number; title: string }[] | null
    source_words: { count: number }[]
  }
  const collection = Array.isArray(row.collections) ? row.collections[0] : row.collections

  return {
    id: row.id,
    title: row.title,
    collectionId: row.collection_id,
    collectionTitle: collection?.title ?? null,
    wordCount: row.source_words?.[0]?.count ?? 0,
  }
})

export const getCollections = cache(async (): Promise<CollectionOption[]> => {
  const supabase = await createClient()
  const { data } = await supabase.from("collections").select("id, title").order("id")
  return (data ?? []) as CollectionOption[]
})

export async function getSourceWords(sourceId: number): Promise<SourceWordRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("source_words")
    .select("position, example, example_fa, updated_at, words!inner(id, en, sense, fa, level, updated_at)")
    .eq("source_id", sourceId)
    .eq("deleted", false)
    .eq("words.deleted", false)
    .order("position")

  if (error || !data) return []

  type Raw = {
    example: string | null
    example_fa: string | null
    updated_at: string
    words: { id: number; en: string; sense: string | null; fa: string; level: number; updated_at: string }
  }
  return (data as unknown as Raw[]).map((r) => ({
    wordId: r.words.id,
    en: r.words.en,
    fa: r.words.fa,
    sense: r.words.sense,
    level: r.words.level,
    example: r.example,
    exampleFa: r.example_fa,
    updatedAt: r.updated_at > r.words.updated_at ? r.updated_at : r.words.updated_at,
  }))
}
