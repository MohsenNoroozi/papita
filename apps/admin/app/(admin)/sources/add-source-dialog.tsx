"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { createSource } from "./actions"
import type { CollectionOption } from "./sources-table"

export function AddSourceDialog({
                                    open,
                                    onOpenChange,
                                    collections,
                                }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    collections: CollectionOption[]
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // کالکشن‌ها بر اساس id مرتب‌اند؛ آخرین مورد پیش‌فرض است
    const defaultCollectionId = String(collections.at(-1)?.id ?? "")

    const [title, setTitle] = useState("")
    const [collectionId, setCollectionId] = useState(defaultCollectionId)
    const [error, setError] = useState<string | null>(null)

    function handleOpenChange(next: boolean) {
        if (isPending) return
        if (next) {
            setTitle("")
            setCollectionId(defaultCollectionId)
            setError(null)
        }
        onOpenChange(next)
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)

        startTransition(async () => {
            const result = await createSource({ title, collectionId: Number(collectionId) })

            if (!result.ok) {
                setError(result.error)
                return
            }

            toast.success(`منبع «${result.title}» اضافه شد`)
            onOpenChange(false)
            router.push(`/sources/${result.id}`)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>منبع جدید</DialogTitle>
                        <DialogDescription>نام منبع و مجموعه آن را مشخص کنید.</DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <Label htmlFor="source-title">نام منبع</Label>
                            <Input
                                id="source-title"
                                autoFocus
                                required
                                maxLength={200}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                aria-invalid={!!error}
                            />
                        </Field>

                        <Field>
                            <Label htmlFor="source-collection">مجموعه</Label>
                            <Select
                                value={collectionId}
                                onValueChange={(v) => setCollectionId(v ?? "")}
                                items={collections.map((c) => ({ value: String(c.id), label: c.title }))}
                            >
                                <SelectTrigger id="source-collection" className="w-full">
                                    <SelectValue placeholder="انتخاب مجموعه" />
                                </SelectTrigger>
                                <SelectContent>
                                    {collections.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <FieldError>{error}</FieldError>
                    </FieldGroup>

                    <DialogFooter>
                        <Button type="submit" disabled={isPending || !title.trim() || !collectionId}>
                            {isPending ? "صبر کنید..." : "افزودن"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => handleOpenChange(false)}
                        >
                            انصراف
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}