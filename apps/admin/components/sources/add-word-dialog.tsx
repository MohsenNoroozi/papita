"use client"

import { useRef, useState, useTransition, type FormEvent } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LevelPicker } from "@/components/sources/cell-editor"
import { addWord } from "@/app/(admin)/sources/[id]/actions"

const EMPTY = { en: "", fa: "", example: "", exampleFa: "", sense: "", level: "1" }

export function AddWordDialog({ sourceId }: { sourceId: number }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [pending, startTransition] = useTransition()
  const enRef = useRef<HTMLInputElement>(null)

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((s) => ({ ...s, [k]: v }))
  const canSave = form.en.trim() !== "" && form.fa.trim() !== ""

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setForm(EMPTY)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSave || pending) return

    startTransition(async () => {
      const res = await addWord(sourceId, form)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("واژه اضافه شد")
      // مودال باز می‌ماند؛ فرم خالی می‌شود و فوکوس به واژه انگلیسی برمی‌گردد
      setForm(EMPTY)
      enRef.current?.focus()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button className="bg-brand-deep">
            <HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" />
            افزودن واژه
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>افزودن واژه</DialogTitle>
          <DialogDescription>بعد از ذخیره، فرم خالی می‌شود تا واژهٔ بعدی را وارد کنید.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-en">واژه انگلیسی</Label>
              <Input
                id="add-en"
                ref={enRef}
                dir="ltr"
                autoFocus
                required
                value={form.en}
                onChange={(e) => set("en")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-fa">ترجمه</Label>
              <Input id="add-fa" required value={form.fa} onChange={(e) => set("fa")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-example">مثال</Label>
              <Input id="add-example" dir="ltr" value={form.example} onChange={(e) => set("example")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-example-fa">ترجمه مثال</Label>
              <Input id="add-example-fa" value={form.exampleFa} onChange={(e) => set("exampleFa")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-sense">زمینه</Label>
              <Input id="add-sense" dir="ltr" value={form.sense} onChange={(e) => set("sense")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>سطح</Label>
              <LevelPicker value={form.level} onChange={set("level")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              بستن
            </Button>
            <Button type="submit" disabled={!canSave || pending} className="bg-brand-deep">
              {pending ? "در حال ذخیره..." : "ذخیره"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
