import type { Metadata } from "next"
import { PagePlaceholder } from "@/components/admin/page-placeholder"

export const metadata: Metadata = { title: "منابع" }

export default function ResourcesPage() {
    return <PagePlaceholder title="منابع" description="این صفحه‌ی نمایشی منابع است." />
}