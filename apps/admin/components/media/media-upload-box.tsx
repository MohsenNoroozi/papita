"use client"

import { useRef, useState, useTransition, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { MEDIA_BUCKET, MEDIA_FILE_MAX_BYTES, mediaTypeFromMime, type MediaType } from "@/lib/media"
import { commitMediaUpload, createMediaUploadUrl, removeMediaFile } from "@/app/(admin)/media/[id]/actions"

type Props = {
    mediaId: number
    type: MediaType
    fileUrl: string | null
}

export function MediaUploadBox({ mediaId, type, fileUrl }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [dragging, setDragging] = useState(false)
    const [pending, startTransition] = useTransition()

    function upload(file: File | undefined) {
        if (!file || pending) return
        if (!mediaTypeFromMime(file.type)) {
            toast.error("فقط فایل صوتی یا ویدیویی مجاز است")
            return
        }
        if (file.size > MEDIA_FILE_MAX_BYTES) {
            toast.error("حجم فایل زیاد است")
            return
        }

        startTransition(async () => {
            const target = await createMediaUploadUrl(mediaId, "file", {
                name: file.name,
                type: file.type,
                size: file.size,
            })
            if (!target.ok) {
                toast.error(target.error)
                return
            }

            // آپلود مستقیم به Storage؛ فایل از Server Action عبور نمی‌کند
            const { error } = await createClient()
                .storage.from(MEDIA_BUCKET)
                .uploadToSignedUrl(target.path, target.token, file, { contentType: file.type })
            if (error) {
                toast.error("آپلود فایل ناموفق بود")
                return
            }

            const res = await commitMediaUpload(mediaId, "file", target.path, file.type)
            if (res.ok) toast.success("فایل مدیا به‌روز شد")
            else toast.error(res.error)
        })
    }

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = "" // انتخاب دوبارهٔ همان فایل هم change بدهد
        upload(file)
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault()
        setDragging(false)
        upload(e.dataTransfer.files[0])
    }

    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
        }
    }

    function handleRemove() {
        if (!fileUrl || pending) return
        startTransition(async () => {
            const result = await removeMediaFile(mediaId)
            if (result.ok) toast.success("فایل مدیا حذف شد")
            else toast.error(result.error)
        })
    }

    return (
        <Card className="shadow-none">
            <CardContent className="space-y-4">
                <input
                    ref={inputRef}
                    type="file"
                    accept="audio/*,video/*"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={handleChange}
                />

                {fileUrl ? (
                    type === "video" ? (
                        <video key={fileUrl} src={fileUrl} controls preload="metadata" className="block aspect-video max-h-80 w-full max-w-full rounded-2xl bg-black object-contain" />
                    ) : (
                        <audio key={fileUrl} src={fileUrl} controls preload="metadata" className="block w-full max-w-full" />
                    )
                ) : (
                    <div
                        role="button"
                        tabIndex={pending ? -1 : 0}
                        aria-disabled={pending}
                        aria-label="برای آپلود فایل کلیک کنید یا فایل را اینجا رها کنید"
                        onClick={() => !pending && inputRef.current?.click()}
                        onKeyDown={handleKeyDown}
                        onDragEnter={(e) => {
                            e.preventDefault()
                            if (!pending) setDragging(true)
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
                        }}
                        onDrop={handleDrop}
                        className={`flex ${type === "video" ? "aspect-video" : "h-14"} w-full cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 text-center text-sm text-muted-foreground outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 ${dragging ? "border-brand-deep bg-brand-deep/5" : "hover:bg-muted/50"} ${pending ? "pointer-events-none opacity-60" : ""}`}
                    >
                        {pending ? "در حال آپلود..." : dragging ? "فایل را رها کنید" : "برای آپلود کلیک کنید یا فایل را اینجا بکشید"}
                    </div>
                )}
                <div className="flex gap-2">
                    <Button type="button" className="min-w-0 flex-1 bg-brand-deep" disabled={pending} onClick={() => inputRef.current?.click()}>
                        {pending ? "در حال آپلود..." : fileUrl ? "جایگزینی فایل" : "آپلود فایل"}
                    </Button>
                    <Button type="button" variant="destructive" className="min-w-0 flex-1" disabled={pending || !fileUrl} onClick={handleRemove}>
                        حذف فایل
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
