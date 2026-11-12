"use client"

import { useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateSource } from "@/app/(admin)/sources/[id]/actions"
import type { CollectionOption } from "@/lib/data/sources"

type Props = {
  source: { id: number; title: string; collectionId: number | null }
  collections: CollectionOption[]
}

export function SourceSettingsForm({ source, collections }: Props) {
  const initialCollection = source.collectionId ? String(source.collectionId) : null
  const [title, setTitle] = useState(source.title)
  const [collectionId, setCollectionId] = useState<string | null>(initialCollection)
  const [pending, startTransition] = useTransition()

  const items = collections.map((c) => ({ value: String(c.id), label: c.title }))
  const dirty = title.trim() !== source.title || collectionId !== initialCollection
  const valid = title.trim().length > 0 && collectionId !== null

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!valid || !dirty || pending) return

    startTransition(async () => {
      const res = await updateSource(source.id, { title, collectionId: Number(collectionId) })
      if (res.ok) toast.success("تنظیمات منبع ذخیره شد")
      else toast.error(res.error)
    })
  }

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>عمومی</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="source-title">عنوان منبع</FieldLabel>
                <Input
                  id="source-title"
                  dir="ltr"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="source-collection">Collection</FieldLabel>
                <Select items={items} value={collectionId} onValueChange={setCollectionId}>
                  <SelectTrigger id="source-collection" className="w-full">
                    <SelectValue placeholder="انتخاب collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
