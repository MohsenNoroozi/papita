"use client"

import { useState, useTransition, type FormEvent, type ReactNode } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { ActionResult } from "@/app/(admin)/sources/[id]/actions"

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const

export function LevelPicker({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label="سطح" dir="ltr" className={cn("flex flex-wrap gap-1", className)}>
      {LEVELS.map((label, i) => {
        const v = String(i + 1)
        const selected = value === v
        return (
          <button
            key={label}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={cn(
              "h-7 min-w-9 rounded-full border px-2 text-xs transition-colors",
              selected ? "border-brand-deep bg-brand-deep text-white" : "hover:bg-muted"
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export type EditorField = {
  name: string
  label: string
  value: string
  type?: "text" | "textarea" | "level"
  dir?: "ltr" | "rtl"
  required?: boolean
}

type Props = {
  title: string
  fields: EditorField[]
  onSave: (values: Record<string, string>) => Promise<ActionResult>
  children: ReactNode, // محتوای سلول (قابل کلیک)
  className?: string
}

// ویرایش سلول به‌صورت Popover
export function CellEditor({ title, fields, onSave, children, className }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (next) setValues(Object.fromEntries(fields.map((f) => [f.name, f.value])))
    setOpen(next)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    const unchanged = fields.every((f) => (values[f.name] ?? "").trim() === f.value.trim())
    if (unchanged) return setOpen(false)

    startTransition(async () => {
      const res = await onSave(values)
      if (res.ok) {
        toast.success("ذخیره شد")
        setOpen(false)
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
          className={cn(
              "block w-full cursor-pointer rounded-md px-2 py-1.5 text-start hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
              className
          )}
        aria-label={`ویرایش ${title}`}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f, i) => {
            const id = `cell-${f.name}`
            const set = (v: string) => setValues((s) => ({ ...s, [f.name]: v }))
            return (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={id} className="text-xs text-muted-foreground">
                  {f.label}
                </Label>
                {f.type === "level" ? (
                  <LevelPicker value={values[f.name] ?? f.value} onChange={set} />
                ) : f.type === "textarea" ? (
                  <Textarea
                    id={id}
                    dir={f.dir}
                    rows={2}
                    autoFocus={i === 0}
                    onFocus={i === 0 ? (e) => e.currentTarget.select() : undefined}
                    value={values[f.name] ?? ""}
                    onChange={(e) => set(e.target.value)}
                  />
                ) : (
                  <Input
                    id={id}
                    dir={f.dir}
                    autoFocus={i === 0}
                    onFocus={i === 0 ? (e) => e.currentTarget.select() : undefined}
                    required={f.required}
                    value={values[f.name] ?? ""}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </div>
            )
          })}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" size="sm" disabled={pending} className="bg-brand-deep">
              {pending ? "..." : "ذخیره"}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
