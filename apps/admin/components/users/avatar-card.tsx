"use client"

import { useRef, useTransition, type ChangeEvent } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { UserAvatar } from "@/components/users/user-avatar"
import { removeAvatar, uploadAvatar } from "@/app/(admin)/users/[id]/actions"
import { cn } from "@/lib/utils"

const SIZE = 512

// برش مربعی از وسط تصویر + کوچک‌سازی به JPEG؛ هم حجم را کم می‌کند هم فرمت را یکدست
async function toSquareJpeg(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas")
    ctx.fillStyle = "#fff" // پس‌زمینهٔ تصاویر شفاف
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        SIZE,
        SIZE
    )
    bitmap.close()
    return new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85)
    )
}

type Props = {
    userId: string
    fullname: string
    avatarUrl: string | null
    className?: string
}

export function AvatarCard({ userId, fullname, avatarUrl, className }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [pending, startTransition] = useTransition()

    function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = "" // انتخاب دوبارهٔ همان فایل هم change بدهد
        if (!file) return
        if (!file.type.startsWith("image/")) {
            toast.error("فایل انتخاب‌شده تصویر نیست")
            return
        }

        startTransition(async () => {
            let blob: Blob
            try {
                blob = await toSquareJpeg(file)
            } catch {
                toast.error("پردازش تصویر ناموفق بود")
                return
            }
            const body = new FormData()
            body.append("file", blob, "avatar.jpg")
            const res = await uploadAvatar(userId, body)
            if (res.ok) toast.success("آواتار به‌روز شد")
            else toast.error(res.error)
        })
    }

    function handleRemove() {
        startTransition(async () => {
            const res = await removeAvatar(userId)
            if (res.ok) toast.success("آواتار حذف شد")
            else toast.error(res.error)
        })
    }

    return (
        <Card className={cn("shadow-none", className)}>
            <CardContent className="flex flex-col items-center gap-3">
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    tabIndex={-1}
                    onChange={handleFile}
                />

                <button
                    type="button"
                    disabled={pending}
                    onClick={() => inputRef.current?.click()}
                    aria-label={`تغییر آواتار ${fullname}`}
                    className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
                >
                    <UserAvatar src={avatarUrl} className="size-40" />
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <HugeiconsIcon icon={Camera01Icon} size={32} aria-hidden="true" />
          </span>
                </button>

                <p className="text-xs text-muted-foreground">
                    {pending ? "در حال ذخیره..." : "برای تغییر، روی تصویر کلیک کنید"}
                </p>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending || !avatarUrl}
                    onClick={handleRemove}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    حذف آواتار
                </Button>
            </CardContent>
        </Card>
    )
}