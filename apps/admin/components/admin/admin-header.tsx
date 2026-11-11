"use client"

import { useEffect, useState } from "react"

import { SearchPopover } from "@/components/admin/search-popover"
import { UserMenu, type AdminUser } from "@/components/admin/user-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function AdminHeader({ user }: { user: AdminUser }) {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 56)
        onScroll()
        window.addEventListener("scroll", onScroll, { passive: true })
        return () => window.removeEventListener("scroll", onScroll)
    }, [])

    return (
        <header
            className={cn(
                "sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 bg-gray-50 px-4 transition-shadow",
                scrolled && "shadow-md"
            )}
        >
            {/* همبرگر فقط در موبایل، مثل $q.screen.lt.md */}
            <SidebarTrigger className="md:hidden" />
            <div className="ms-auto flex items-center gap-2">
                <SearchPopover />
                <UserMenu user={user} />
            </div>
        </header>
    )
}