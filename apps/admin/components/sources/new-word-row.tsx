"use client"

import { useState, useTransition, type KeyboardEvent } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Cancel01Icon, Tick02Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { LevelPicker } from "@/components/sources/cell-editor"
import { addWord } from "@/app/(admin)/sources/[id]/actions"

const EMPTY = { en: "", fa: "", example: "", exampleFa: "", level: "1", sense: "" }

// ردیف پیش‌نویس بالای جدول برای افزودن واژه
export function NewWordRow({ sourceId, onClose }: { sourceId: number; onClose: () => void }) {
  const [form, setForm] = useState(EMPTY)
  const [pending, startTransition] = useTransition()
  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((s) => ({ ...s, [k]: v }))
  const canSave = form.en.trim() && form.fa.trim()

  function save() {
    if (!canSave || pending) return
    startTransition(async () => {
      const res = await addWord(sourceId, form)
      if (res.ok) {
        toast.success("واژه اضافه شد")
        onClose()
      } else {
        toast.error(res.error)
      }
    })
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      save()
    }
    if (e.key === "Escape") onClose()
  }

  return (
    <TableRow className="bg-brand-deep/5 align-top hover:bg-brand-deep/5" onKeyDown={onKeyDown}>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell>
        <Input dir="ltr" autoFocus placeholder="English" aria-label="واژه انگلیسی" value={form.en} onChange={(e) => set("en")(e.target.value)} />
      </TableCell>
      <TableCell>
        <Input placeholder="ترجمه" aria-label="ترجمه" value={form.fa} onChange={(e) => set("fa")(e.target.value)} />
      </TableCell>
      <TableCell className="space-y-2">
        <Input dir="ltr" placeholder="Example" aria-label="مثال" value={form.example} onChange={(e) => set("example")(e.target.value)} />
        <Input placeholder="ترجمه مثال" aria-label="ترجمه مثال" value={form.exampleFa} onChange={(e) => set("exampleFa")(e.target.value)} />
      </TableCell>
      <TableCell>
        <LevelPicker value={form.level} onChange={set("level")} className="w-32" />
      </TableCell>
      <TableCell>
        <Input dir="ltr" placeholder="زمینه" aria-label="زمینه" value={form.sense} onChange={(e) => set("sense")(e.target.value)} />
      </TableCell>
      <TableCell className="text-muted-foreground">—</TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="ذخیره" disabled={!canSave || pending} onClick={save}>
            <HugeiconsIcon icon={Tick02Icon} size={18} className="text-brand-green" aria-hidden="true" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="انصراف" onClick={onClose}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} aria-hidden="true" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
