import Link from "next/link"
import { notFound } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getMedia } from "@/lib/data/sources"

const nf = new Intl.NumberFormat("fa-IR")

export default async function MediaPage({ params }: { params: Promise<{ id: string; mediaId: string }> }) {
    const { id, mediaId } = await params
    const sourceId = Number(id)
    const mid = Number(mediaId)
    if (!Number.isInteger(mid) || mid <= 0) notFound()

    const media = await getMedia(sourceId, mid)
    if (!media) notFound()

    return (
        <div className="space-y-4">
            <Link href={`/sources/${sourceId}/media`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {/* در RTL فلش راست = بازگشت */}
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
                بازگشت به لیست مدیا
            </Link>

            <Card className="shadow-none">
                <CardHeader>
                    <CardTitle dir="auto" className="text-xl font-black">
                        {media.title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{media.type === "audio" ? "صوت" : "ویدیو"}</Badge>
                        <span className="text-sm text-muted-foreground">{nf.format(media.phraseCount)} عبارت</span>
                    </div>
                    {media.description && (
                        <p dir="auto" className="text-sm text-muted-foreground">
                            {media.description}
                        </p>
                    )}
                    <p className="text-sm text-muted-foreground">این صفحهٔ نمایشی مدیا است.</p>
                </CardContent>
            </Card>
        </div>
    )
}