import type { Metadata } from "next"
import { PagePlaceholder } from "@/components/admin/page-placeholder"

export const metadata: Metadata = { title: "کاربران" }

export default function UsersPage() {
    return <PagePlaceholder title="کاربران" description="این صفحه‌ی نمایشی کاربران است." />
}