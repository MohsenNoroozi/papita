import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Card } from "@/components/ui/card"
import { MediaTabs } from "@/components/media/media-tabs"
import { MediaTypeIcon } from "@/components/media/media-type-icon"
import { getMedia } from "@/lib/data/media"
import { MEDIA_TYPE_LABEL } from "@/lib/media"

type Props = { params: Promise<{ id: string }> }

const parseId = (id: string) => {
    const n = Number(id)
    return Number.isInteger(n) && n > 0 ? n : null
}

// عنوان اختیاری است؛ اگر نداشت، شناسه نمایش داده می‌شود
const mediaLabel = (title: string | null, id: number) =>
    title?.trim() || `مدیا ${new Intl.NumberFormat("fa-IR").format(id)}`

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const mediaId = parseId((await params).id)
    const media = mediaId ? await getMedia(mediaId) : null
    return { title: media ? mediaLabel(media.title, media.id) : "مدیا" }
}

export default async function MediaLayout({ children, params }: Props & { children: React.ReactNode }) {
    const mediaId = parseId((await params).id)
    if (!mediaId) notFound()

    const media = await getMedia(mediaId)
    if (!media) notFound()

    const label = mediaLabel(media.title, media.id)

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">جزئیات مدیا</h1>
                <Breadcrumb className="mt-1">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink render={<Link href="/dashboard" />}>خانه</BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="rtl:rotate-180" />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{label}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            {/* کارت عنوان: بدون padding عمودی تا خط زیر تب فعال روی border پایین کارت بنشیند */}
            <Card className="gap-0 overflow-hidden py-0 shadow-none">
                <div className="flex items-center gap-5 p-6">
                    <div
                        className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-deep/10 text-brand-deep"
                        title={MEDIA_TYPE_LABEL[media.type]}
                    >
                        <MediaTypeIcon type={media.type} size={40} />
                        <span className="sr-only">{MEDIA_TYPE_LABEL[media.type]}</span>
                    </div>
                    <div className="space-y-1">
                        <h2 dir="auto" className="text-3xl leading-tight font-black">
                            {label}
                        </h2>
                        {media.sourceTitle && (
                            <Link
                                href={`/sources/${media.sourceId}`}
                                className="inline-flex items-center gap-1 text-sm text-brand-deep hover:underline"
                            >
                                {media.sourceTitle}
                                <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                </div>

                <div className="mx-6">
                    <MediaTabs mediaId={media.id} />
                </div>
            </Card>

            {children}
        </div>
    )
}