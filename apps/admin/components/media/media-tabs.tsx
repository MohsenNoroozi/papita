"use client"

import Link from "next/link"
import { useSelectedLayoutSegment } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
    { segment: "sentences", label: "جملات" },
    { segment: "details", label: "مشخصات" },
] as const

export function MediaTabs({ mediaId }: { mediaId: number }) {
    // segment فعال زیر layout مدیا: "sentences" | "details"
    const active = useSelectedLayoutSegment()

    return (
        <nav aria-label="بخش‌های مدیا" className="border-t">
            <ul className="flex">
                {TABS.map(({ segment, label }) => {
                    const isActive = active === segment
                    return (
                        <li key={segment}>
                            <Link
                                href={`/media/${mediaId}/${segment}`}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                    "relative block px-5 py-3 text-sm text-foreground/80 transition-colors hover:text-brand-deep",
                                    isActive &&
                                    "font-medium text-brand-deep after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand-deep"
                                )}
                            >
                                {label}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}