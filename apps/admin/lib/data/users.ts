import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

export type UserRow = {
    id: string
    fullname: string
    email: string
    phone: string | null
    avatarUrl: string | null
    age: number | null
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
    created_at: string
    updated_at: string
}

const COLUMNS = "id, fullname, email, phone, avatar_url, age, created_at, updated_at"

const toUser = (r: ProfileRecord): UserRow => ({
    id: r.id,
    fullname: r.fullname,
    email: r.email,
    phone: r.phone,
    avatarUrl: r.avatar_url,
    age: r.age,
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

// cache: اگر هم generateMetadata و هم page صدا بزنند فقط یک کوئری اجرا شود
export const getUser = cache(async (id: string): Promise<UserRow | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase.from("profiles").select(COLUMNS).eq("id", id).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toUser(data as ProfileRecord) : null
})