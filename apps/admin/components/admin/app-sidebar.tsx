"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { APP_NAME, navItems } from "@/config/nav"
import { cn } from "@/lib/utils"

export function AppSidebar() {
    const pathname = usePathname()
    const { toggleSidebar, setOpenMobile } = useSidebar()

    const isActive = (href: string) =>
        pathname === href || pathname.startsWith(`${href}/`)

    return (
        // z-30: بالاتر از هدر (z-20) تا دکمه‌ی لبه روی صفحه هم دیده شود
        <Sidebar side="right" dir="rtl" collapsible="icon" className="z-30">
            <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label="باز و بسته کردن منو"
                onClick={toggleSidebar}
                className="absolute top-6 -end-3 z-50 hidden rounded-full bg-white shadow-md md:flex"
            >
                <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={14}
                    className="text-brand-deep transition-transform duration-300 group-data-[state=collapsed]:rotate-180"
                />
            </Button>

            <SidebarHeader className="h-16 justify-center">
                <div className="flex items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                    <Image
                        src="/images/logo.png"
                        alt=""
                        width={64}
                        height={64}
                        className="size-8 shrink-0 object-contain group-data-[collapsible=icon]:size-12"
                    />
                    <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-black tracking-wide text-white">
              {APP_NAME}
            </span>
                        <span className="text-xs text-sidebar-foreground">پنل مدیریت</span>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {navItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    size="lg"
                                    tooltip={{ children: item.title, side: "left" }}
                                    isActive={isActive(item.href)}
                                    className={cn(
                                        "text-base data-active:font-bold [&>svg]:size-6",
                                        // حالت بسته: وسط‌چین، آیکون بزرگ‌تر
                                        "group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-12! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-2xl"
                                    )}
                                    render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                                >
                                    <HugeiconsIcon icon={item.icon} />
                                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}