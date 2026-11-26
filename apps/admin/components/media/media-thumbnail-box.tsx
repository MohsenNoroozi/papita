"use client"

import { useRef, useState, useTransition, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { MEDIA_BUCKET, THUMBNAIL_MAX_BYTES, THUMBNAIL_TYPES } from "@/lib/media"
import { commitMediaUpload, createMediaUploadUrl, removeThumbnail } from "@/app/(admin)/media/[id]/actions"

type Props = {
    mediaId: number
    thumbnailUrl: string | null
}

export function MediaThumbnailBox({ mediaId, thumbnailUrl }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const [pending, startTransition] = useTransition()

    function upload(file: File | undefined) {
        if (!file || pending) return
        if (!THUMBNAIL_TYPES.includes(file.type)) {
            toast.error("تصویر باید JPG، PNG یا WebP باشد")
            return
        }
        if (file.size > THUMBNAIL_MAX_BYTES) {
            toast.error("حجم تصویر زیاد است (حداکثر ۲ مگابایت)")
            return
        }

        startTransition(async () => {
            const target = await createMediaUploadUrl(mediaId, "thumbnail", {
                name: file.name,
                type: file.type,
                size: file.size,
            })
            if (!target.ok) {
                toast.error(target.error)
                return
            }
            const { error } = await createClient()
                .storage.from(MEDIA_BUCKET)
                .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type })
            if (error) {
                toast.error("آپلود تصویر ناموفق بود")
                return
            }
            const result = await commitMediaUpload(mediaId, "thumbnail", target.path, file.type)
            if (result.ok) toast.success("تصویر بندانگشتی به‌روز شد")
            else toast.error(result.error)
        })
    }

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ""
        upload(file)
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault()
        setDragging(false)
        if (!thumbnailUrl) upload(e.dataTransfer.files[0])
    }

    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
        }
    }

    function handleRemove() {
        if (!thumbnailUrl || pending) return
        startTransition(async () => {
            const result = await removeThumbnail(mediaId)
            if (result.ok) toast.success("تصویر بندانگشتی حذف شد")
            else toast.error(result.error)
        })
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle>تصویر بندانگشتی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <input
                    ref={inputRef}
                    type="file"
                    accept={THUMBNAIL_TYPES.join(",")}
                    className="sr-only"
                    tabIndex={-1}
                    onChange={handleChange}
                />
                <div
                    className={`flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border ${!thumbnailUrl ? `cursor-pointer border-2 border-dashed text-center outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${dragging ? "border-brand-deep bg-brand-deep/5" : "hover:bg-muted/50"} ${pending ? "pointer-events-none opacity-60" : ""}` : ""}`}
                    role={thumbnailUrl ? undefined : "button"}
                    tabIndex={thumbnailUrl || pending ? -1 : 0}
                    aria-disabled={pending}
                    aria-label="برای آپلود کلیک کنید یا تصویر را اینجا رها کنید"
                    onClick={() => !thumbnailUrl && !pending && inputRef.current?.click()}
                    onKeyDown={handleKeyDown}
                    onDragEnter={(e) => {
                        if (!thumbnailUrl) {
                            e.preventDefault()
                            if (!pending) setDragging(true)
                        }
                    }}
                    onDragOver={(e) => {
                        if (!thumbnailUrl) e.preventDefault()
                    }}
                    onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
                    }}
                    onDrop={handleDrop}
                >
                    {thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={thumbnailUrl} src={thumbnailUrl} alt="تصویر بندانگشتی" className="size-full object-contain" />
                    ) : (
                        <span className="px-4 text-sm text-muted-foreground">
                            {pending ? "در حال آپلود..." : dragging ? "تصویر را رها کنید" : "برای آپلود کلیک کنید یا تصویر را اینجا بکشید"}
                        </span>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button type="button" className="min-w-0 flex-1 bg-brand-deep" disabled={pending} onClick={() => inputRef.current?.click()}>
                        {pending ? "در حال ذخیره..." : thumbnailUrl ? "جایگزینی تصویر" : "آپلود تصویر"}
                    </Button>
                    <Button type="button" variant="destructive" className="min-w-0 flex-1" disabled={pending || !thumbnailUrl} onClick={handleRemove}>
                        حذف تصویر
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
