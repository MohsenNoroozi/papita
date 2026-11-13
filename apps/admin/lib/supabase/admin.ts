import "server-only"
import { createClient } from "@supabase/supabase-js"

// فقط سمت سرور؛ RLS را دور می‌زند، پس فقط بعد از بررسی ادمین بودن استفاده شود
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}