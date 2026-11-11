import {cookies} from "next/headers"
import {redirect} from "next/navigation"
import type {CSSProperties, ReactNode} from "react"

import {AdminHeader} from "@/components/admin/admin-header"
import {AppSidebar} from "@/components/admin/app-sidebar"
import {SidebarInset, SidebarProvider} from "@/components/ui/sidebar"
import {APP_NAME} from "@/config/nav"
import {createClient} from "@/lib/supabase/server"

export default async function AdminLayout({children}: { children: ReactNode }) {
    const supabase = await createClient()
    const {
        data: {user},
    } = await supabase.auth.getUser()
    if (!user) redirect("/")

    const cookieStore = await cookies()
    const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false"

    const meta = user.user_metadata ?? {}
    const adminUser = {
        name: meta.full_name ?? meta.name ?? user.email ?? "",
        email: user.email ?? "",
        avatar: (meta.avatar_url as string | undefined) ?? null,
    }

    return (
        <SidebarProvider
            defaultOpen={defaultOpen}
            style={
                {
                    "--sidebar-width": "17.5rem",       /* 280px */
                    "--sidebar-width-icon": "4.6875rem", /* 75px */
                } as CSSProperties
            }
        >
            <AppSidebar/>
            <SidebarInset className="bg-gray-50">
                <AdminHeader user={adminUser}/>
                <div className="flex-1 px-4 md:px-6">{children}</div>
                <footer className="px-6 py-3 text-xs text-gray-500 text-left">
                  <span>© {new Date().getFullYear()} {APP_NAME}</span>
                </footer>
            </SidebarInset>
        </SidebarProvider>
    )
}