"use server"

import { createClient } from "@/lib/supabase/server"

export type PhraseInput = {
    startMs: number
    endMs: number
    sentences: { en: string; fa: string }[]
}
export type PhraseActionResult = { ok: true; id?: number } | { ok: false; error: string }

const fail = (error: string): PhraseActionResult => ({ ok: false, error })
const validId = (id: number) => Number.isInteger(id) && id > 0

async function authenticatedClient() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user ? supabase : null
}

function validInput(input: PhraseInput) {

    return Number.isFinite(input.startMs) && input.startMs >= 0 &&
        Number.isFinite(input.endMs) && input.endMs > input.startMs &&
        Array.isArray(input.sentences) && input.sentences.length > 0 &&
        input.sentences.every((line) => typeof line.en === "string" && typeof line.fa === "string")
        // && input.sentences.some((line) => line.en.trim() || line.fa.trim())
}

function contentOf(sentences: PhraseInput["sentences"]) {
    return {
        version: 1,
        sentences: sentences.map((line, index) => ({
            id: `sentence-${index + 1}`,
            position: index,
            text: line.en,
            translations: { fa: line.fa },
        })),
    }
}

export async function createPhrase(mediaId: number, input: PhraseInput): Promise<PhraseActionResult> {
    if (!validId(mediaId) || !validInput(input)) return fail("اطلاعات عبارت نامعتبر است")
    const supabase = await authenticatedClient()
    if (!supabase) return fail("لطفاً دوباره وارد شوید")
    const { data, error } = await supabase.from("phrases").insert({
        media_id: mediaId,
        start_ms: Math.round(input.startMs),
        end_ms: Math.round(input.endMs),
        content: contentOf(input.sentences),
    }).select("id").single()
    if (error) return fail(error.code === "42501" ? "دسترسی لازم را ندارید" : "ذخیره عبارت انجام نشد")
    return { ok: true, id: data.id }
}

export async function updatePhrase(phraseId: number, input: PhraseInput): Promise<PhraseActionResult> {
    if (!validId(phraseId) || !validInput(input)) return fail("اطلاعات عبارت نامعتبر است")
    const supabase = await authenticatedClient()
    if (!supabase) return fail("لطفاً دوباره وارد شوید")
    const { data, error } = await supabase.from("phrases").update({
        start_ms: Math.round(input.startMs),
        end_ms: Math.round(input.endMs),
        content: contentOf(input.sentences),
    }).eq("id", phraseId).select("id")
    if (error) return fail(error.code === "42501" ? "دسترسی لازم را ندارید" : "ذخیره عبارت انجام نشد")
    if (!data?.length) return fail("عبارت پیدا نشد یا دسترسی لازم را ندارید")
    return { ok: true }
}

export async function deletePhrase(phraseId: number): Promise<PhraseActionResult> {
    if (!validId(phraseId)) return fail("عبارت نامعتبر است")
    const supabase = await authenticatedClient()
    if (!supabase) return fail("لطفاً دوباره وارد شوید")
    const { data, error } = await supabase.from("phrases").update({ deleted_at: Date.now() }).eq("id", phraseId).select("id")
    if (error) return fail(error.code === "42501" ? "دسترسی لازم را ندارید" : "حذف عبارت انجام نشد")
    if (!data?.length) return fail("عبارت پیدا نشد یا دسترسی لازم را ندارید")
    return { ok: true }
}
