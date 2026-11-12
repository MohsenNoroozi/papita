import { redirect } from "next/navigation"

// تب پیش‌فرض: واژه‌ها
export default async function SourcePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/sources/${id}/words`)
}
