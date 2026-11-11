import type { Metadata } from "next"
import { PagePlaceholder } from "@/components/admin/page-placeholder"

export const metadata: Metadata = { title: "داشبورد" }

export default function DashboardPage() {
    return <PagePlaceholder title="داشبورد" description="این صفحه‌ی نمایشی داشبورد است." />
}