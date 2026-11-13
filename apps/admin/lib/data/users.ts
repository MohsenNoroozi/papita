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
// خواندن صفحه‌به‌صفحه
// Supabase به‌صورت پیش‌فرض حداکثر ۱۰۰۰ ردیف در هر درخواست برمی‌گرداند
// ------------------------------------------------------------
const PAGE = 1000

async function fetchAllPages(
    fetchPage: (
        from: number,
        to: number
    ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>
): Promise<unknown[]> {
    const all: unknown[] = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await fetchPage(from, from + PAGE - 1)
        if (error) throw new Error(error.message)
        all.push(...(data ?? []))
        if (!data || data.length < PAGE) break
    }
    return all
}

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
    const data = (await fetchAllPages((from, to) =>
        supabase
            .from("user_progress")
            .select("word_id, box, due, updated_at, words(en, fa, sense, level)")
            .eq("user_id", userId)
            .eq("deleted", false)
            .order("word_id")
            .range(from, to)
    )) as ProgressRecord[]

    const now = Date.now()
    const rows: UserProgressRow[] = []
    for (const r of data) {
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

// ------------------------------------------------------------
// واژه‌هایی که در هیچ جعبه‌ی این کاربر نیستند (برای افزودن به پیشرفت)
// ------------------------------------------------------------
export type AvailableWord = {
    id: number
    en: string
    fa: string
    sense: string | null
    level: number
}

export async function getAvailableWords(userId: string): Promise<AvailableWord[]> {
    const supabase = await createClient()

    const [words, progress] = await Promise.all([
        fetchAllPages((from, to) =>
            supabase
                .from("words")
                .select("id, en, fa, sense, level")
                .eq("deleted", false)
                .order("id")
                .range(from, to)
        ) as Promise<AvailableWord[]>,
        fetchAllPages((from, to) =>
            supabase
                .from("user_progress")
                .select("word_id")
                .eq("user_id", userId)
                .eq("deleted", false)
                .order("word_id")
                .range(from, to)
        ) as Promise<{ word_id: number }[]>,
    ])

    const inBoxes = new Set(progress.map((r) => r.word_id))
    return words
        .filter((w) => !inBoxes.has(w.id))
        .sort((a, b) => a.en.localeCompare(b.en, "en", { sensitivity: "base" }))
}