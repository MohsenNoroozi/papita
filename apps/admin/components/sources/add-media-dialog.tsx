"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createMedia } from "@/app/(admin)/sources/[id]/actions"

export function AddMediaDialog({ sourceId }: { sourceId: number }) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    const canSave = title.trim() !== ""

    function handleOpenChange(next: boolean) {
        if (pending) return
        if (next) {
            setTitle("")
            setError(null)
        }
        setOpen(next)
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!canSave || pending) return
        setError(null)

        startTransition(async () => {
            const res = await createMedia(sourceId, { title })
            if (!res.ok) {
                setError(res.error)
                return
            }
            toast.success("مدیا اضافه شد")
            setOpen(false)
            router.push(`/sources/${sourceId}/media/${res.id}`)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button className="bg-brand-deep">
                        <HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" />
                        افزودن مدیا
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>مدیای جدید</DialogTitle>
                        <DialogDescription>عنوان مدیا را وارد کنید؛ بعد از ایجاد به صفحهٔ مدیا می‌روید.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="media-title">عنوان</FieldLabel>
                            <Input
                                id="media-title"
                                dir="auto"
                                autoFocus
                                required
                                maxLength={200}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                aria-invalid={!!error}
                            />
                        </Field>

                        <FieldError>{error}</FieldError>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={!canSave || pending} className="bg-brand-deep">
                            {pending ? "در حال ذخیره..." : "ایجاد"}
                        </Button>
                        <Button type="button" variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>
                            انصراف
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}