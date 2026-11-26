"use client"

import { useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MEDIA_TYPES, MEDIA_TYPE_LABEL, type MediaType } from "@/lib/media"
import { updateMedia } from "@/app/(admin)/media/[id]/actions"

const TYPE_ITEMS = MEDIA_TYPES.map((t) => ({ value: t, label: MEDIA_TYPE_LABEL[t] }))

type Props = {
    media: {
        id: number
        type: MediaType
        title: string | null
        description: string | null
        position: number
    }
}

export function MediaDetailsForm({ media }: Props) {
    const initial = {
        type: media.type as string,
        title: media.title ?? "",
        description: media.description ?? "",
        position: String(media.position),
    }
    const [form, setForm] = useState(initial)
    const [pending, startTransition] = useTransition()

    const set = (k: keyof typeof initial) => (v: string) => setForm((s) => ({ ...s, [k]: v }))
    const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k].trim() !== initial[k])
    const valid = form.position.trim() !== ""

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!valid || !dirty || pending) return

        startTransition(async () => {
            const res = await updateMedia(media.id, form)
            if (res.ok) toast.success("مشخصات مدیا ذخیره شد")
            else toast.error(res.error)
        })
    }

    return (
        <Card className="shadow-none">
            <CardHeader>
                <CardTitle>مشخصات</CardTitle>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit}>
                    <FieldGroup>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Field className="md:col-span-2">
                                <FieldLabel htmlFor="media-title">عنوان</FieldLabel>
                                <Input
                                    id="media-title"
                                    dir="auto"
                                    maxLength={200}
                                    value={form.title}
                                    onChange={(e) => set("title")(e.target.value)}
                                />
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="media-type">نوع</FieldLabel>
                                <Select items={TYPE_ITEMS} value={form.type} onValueChange={(v) => set("type")(v ?? form.type)}>
                                    <SelectTrigger id="media-type" className="w-full">
                                        <SelectValue placeholder="انتخاب نوع" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TYPE_ITEMS.map((item) => (
                                            <SelectItem key={item.value} value={item.value}>
                                                {item.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field>
                                <FieldLabel htmlFor="media-position">جایگاه</FieldLabel>
                                <Input
                                    id="media-position"
                                    dir="ltr"
                                    inputMode="numeric"
                                    maxLength={5}
                                    required
                                    value={form.position}
                                    onChange={(e) => set("position")(e.target.value)}
                                />
                            </Field>

                            <Field className="md:col-span-2">
                                <FieldLabel htmlFor="media-description">توضیحات</FieldLabel>
                                <Textarea
                                    id="media-description"
                                    dir="auto"
                                    rows={3}
                                    maxLength={2000}
                                    value={form.description}
                                    onChange={(e) => set("description")(e.target.value)}
                                />
                            </Field>

                        </div>

                        <div>
                            <Button type="submit" disabled={!dirty || !valid || pending} className="bg-brand-deep px-8">
                                {pending ? "در حال ذخیره..." : "ذخیره تغییرات"}
                            </Button>
                        </div>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    )
}
