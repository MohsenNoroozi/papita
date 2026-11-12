"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type CreateSourceResult =
    | { ok: true; id: number; title: string }
    | { ok: false; error: string }

export async function createSource(input: {
    title: string
    collectionId: number
}): Promise<CreateSourceResult> {
    const title = input.title.trim()
    if (!title) return { ok: false, error: "نام منبع را وارد کنید" }
    if (title.length > 200) return { ok: false, error: "نام منبع خیلی طولانی است" }
    if (!Number.isInteger(input.collectionId)) {
        return { ok: false, error: "مجموعه را انتخاب کنید" }
    }

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "ابتدا وارد شوید" }

    // موقعیت: آخرِ همان مجموعه
    const { data: last } = await supabase
        .from("sources")
        .select("position")
        .eq("collection_id", input.collectionId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle()

    const { data, error } = await supabase
        .from("sources")
        .insert({
            title,
            collection_id: input.collectionId,
            position: (last?.position ?? 0) + 1,
        })
        .select("id, title")
        .single()

    if (error) {
        // 42501 = رد شدن توسط RLS (کاربر ادمین نیست)
        return {
            ok: false,
            error: error.code === "42501" ? "شما دسترسی افزودن منبع را ندارید" : "ثبت منبع انجام نشد؛ دوباره تلاش کنید",
        }
    }

    revalidatePath("/sources")
    return { ok: true, id: data.id, title: data.title }
}

export async function reorderSources(
    collectionId: number,
    orderedIds: number[]
): Promise<{ ok: true } | { ok: false; error: string }> {
    if (
        !Number.isInteger(collectionId) ||
        orderedIds.length === 0 ||
        !orderedIds.every(Number.isInteger)
    ) {
        return { ok: false, error: "درخواست نامعتبر است" }
    }

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: "ابتدا وارد شوید" }

    const { error } = await supabase.rpc("reorder_sources", {
        p_collection_id: collectionId,
        p_ids: orderedIds,
    })
    if (error) {
        return {
            ok: false,
            error: error.code === "42501" ? "دسترسی لازم را ندارید" : "ذخیرهٔ ترتیب انجام نشد؛ دوباره تلاش کنید",
        }
    }

    revalidatePath("/sources")
    return { ok: true }
}