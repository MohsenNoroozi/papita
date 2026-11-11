import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request })
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // مهم: از getUser() استفاده کن، نه getSession()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const isLoginPage = request.nextUrl.pathname === "/"

    const redirectTo = (path: string) => {
        const redirect = NextResponse.redirect(new URL(path, request.url))
        response.cookies.getAll().forEach((c) => redirect.cookies.set(c))
        return redirect
    }

    if (!user && !isLoginPage) return redirectTo("/")
    if (user && isLoginPage) return redirectTo("/dashboard")

    return response
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
}