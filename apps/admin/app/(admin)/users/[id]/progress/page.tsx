import { notFound } from "next/navigation"

import { ProgressTable } from "@/components/users/progress-table"
import { getUserProgress } from "@/lib/data/users"
import { isUuid } from "@/lib/uuid"

export default async function UserProgressPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()

    const rows = await getUserProgress(id)

    return <ProgressTable userId={id} rows={rows} />
}