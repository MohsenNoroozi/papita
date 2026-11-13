import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type UserRow = {
    id: string
    fullname: string
    email: string
    phone: string | null
    avatarUrl: string | null
    age: number | null
    level: number
    createdAt: string
    updatedAt: string
}

type ProfileRecord = {
    id: string
    fullname: string
    email: string
    phone: string | null
    avatar_url: string | null
    age: number | null
    level: number
    created_at: string
    updated_at: string
}

const COLUMNS = "id, fullname, email, phone, avatar_url, age, level, created_at, updated_at"

const toUser = (r: ProfileRecord): UserRow => ({
    id: r.id,
    fullname: r.fullname,
    email: r.email,
    phone: r.phone,
    avatarUrl: r.avatar_url,
    age: r.age,
    level: r.level,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
})

export async function getUsers(): Promise<UserRow[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("profiles")
        .select(COLUMNS)
        .order("created_at")
        .order("id") // برای ترتیب ثابت وقتی created_at برابر است
    if (error) throw new Error(error.message)
    return (data as ProfileRecord[]).map(toUser)
}

// cache: layout و page در یک درخواست فقط یک کوئری اجرا می‌کنند
export const getUser = cache(async (id: string): Promise<UserRow | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("id", id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toUser(data as ProfileRecord) : null
})

// ------------------------------------------------------------
// پیشرفت کاربر (فقط ردیف‌های حذف‌نشده)
// ------------------------------------------------------------
export type UserProgressRow = {
    wordId: number
    en: string
    fa: string
    sense: string | null
    level: number
    box: number
    due: string | null
    overdue: boolean
    updatedAt: string
}

type WordPart = { en: string; fa: string; sense: string | null; level: number }
type ProgressRecord = {
    word_id: number
    box: number | null
    due: string | null
    updated_at: string
    words: WordPart | WordPart[] | null
}

export async function getUserProgress(userId: string): Promise<UserProgressRow[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("user_progress")
        .select("word_id, box, due, updated_at, words(en, fa, sense, level)")
        .eq("user_id", userId)
        .eq("deleted", false)
        .order("word_id")
    if (error) throw new Error(error.message)

    const now = Date.now()
    const rows: UserProgressRow[] = []
    for (const r of data as unknown as ProgressRecord[]) {
        const word = Array.isArray(r.words) ? r.words[0] : r.words
        if (!word || r.box == null) continue
        rows.push({
            wordId: r.word_id,
            en: word.en,
            fa: word.fa,
            sense: word.sense,
            level: word.level,
            box: r.box,
            due: r.due,
            overdue: r.due != null && Date.parse(r.due) <= now,
            updatedAt: r.updated_at,
        })
    }
    return rows
}