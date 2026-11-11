import type { Metadata } from "next"
import { PagePlaceholder } from "@/components/admin/page-placeholder"

export const metadata: Metadata = { title: "واژه‌ها" }

export default function WordsPage() {
    return <PagePlaceholder title="واژه‌ها" description="این صفحه‌ی نمایشی واژه‌ها است." />
}