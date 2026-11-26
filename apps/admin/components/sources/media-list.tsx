import Link from "next/link"
import { HugeiconsIcon } from "@hugeicons/react"
import { MusicNote01Icon, Video01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AddMediaDialog } from "@/components/sources/add-media-dialog"
import type { MediaItem, MediaType } from "@/lib/data/sources"

const nf = new Intl.NumberFormat("fa-IR")

const TYPE_LABEL: Record<MediaType, string> = { audio: "صوت", video: "ویدیو" }
const TYPE_ICON = { audio: MusicNote01Icon, video: Video01Icon } as const

function MediaCard({ sourceId, media }: { sourceId: number; media: MediaItem }) {
    // thumbnail فقط وقتی آدرس کامل باشد نمایش داده می‌شود (باکت media خصوصی است)
    const thumb = media.thumbnailUrl && /^https?:\/\//.test(media.thumbnailUrl) ? media.thumbnailUrl : null

    return (
        <Link
            href={`/sources/${sourceId}/media/${media.id}`}
            className="group block rounded-4xl outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
            <Card className="h-full gap-0 py-0 shadow-none transition-shadow group-hover:ring-2 group-hover:ring-brand-deep/40">
                <div className="relative flex aspect-video items-center justify-center bg-brand-deep/10 text-brand-deep">
                    {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" className="size-full object-cover" />
                    ) : (
                        <HugeiconsIcon icon={TYPE_ICON[media.type]} size={40} aria-hidden="true" />
                    )}
                </div>

                <CardContent className="space-y-2 p-4">
                    <h3 dir="auto" className="line-clamp-1 font-bold">
                        {media.title}
                    </h3>
                    {media.description && (
                        <p dir="auto" className="line-clamp-2 text-xs text-muted-foreground">
                            {media.description}
                        </p>
                    )}
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{TYPE_LABEL[media.type]}</Badge>
                        <span className="text-xs text-muted-foreground">{nf.format(media.phraseCount)} عبارت</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

export function MediaList({ sourceId, items }: { sourceId: number; items: MediaItem[] }) {
    return (
        <Card className="shadow-none">
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">{nf.format(items.length)} مدیا</p>
                    <AddMediaDialog sourceId={sourceId} />
                </div>

                {items.length === 0 ? (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                        هنوز مدیایی برای این منبع اضافه نشده است
                    </div>
                ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {items.map((m) => (
                            <li key={m.id}>
                                <MediaCard sourceId={sourceId} media={m} />
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}