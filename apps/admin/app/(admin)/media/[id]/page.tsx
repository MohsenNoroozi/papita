import { redirect } from "next/navigation"

// تب پیش‌فرض: جملات
export default async function MediaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/media/${id}/sentences`)
}