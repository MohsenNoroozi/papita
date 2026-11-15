"use client"

import { useState, useTransition, type FormEvent } from "react"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { setProgressDue } from "@/app/(admin)/users/[id]/actions"

const TZ = "Asia/Tehran"
const nf = new Intl.NumberFormat("fa-IR")
const previewFmt = new Intl.DateTimeFormat("fa-IR", { dateStyle: "full", timeZone: TZ })

const PRESETS = [
    { label: "امروز", days: 0 },
    { label: "فردا", days: 1 },
    { label: "۳ روز بعد", days: 3 },
    { label: "یک هفته بعد", days: 7 },
    { label: "دو هفته بعد", days: 14 },
] as const

// امروز به وقت تهران به‌صورت YYYY-MM-DD (locale en-CA همین قالب را می‌دهد)
const todayTehran = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date())

function addDays(date: string, days: number) {
    const d = new Date(`${date}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
}

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    userId: string
    /** فقط واژه‌هایی که سررسید دارند (غیر از یادگرفته‌شده) */
    wordIds: number[]
    /** تعداد واژه‌های انتخاب‌شده‌ای که نادیده گرفته می‌شوند */
    skipped: number
}

export function SetDueDialog({ open, onOpenChange, userId, wordIds, skipped }: Props) {
    const [date, setDate] = useState(todayTehran)
    const [error, setError] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()

    function handleOpenChange(next: boolean) {
        if (pending) return
        if (next) {
            setDate(todayTehran())
            setError(null)
        }
        onOpenChange(next)
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!date || !wordIds.length || pending) return
        setError(null)

        startTransition(async () => {
            const res = await setProgressDue(userId, wordIds, date)
            if (!res.ok) {
                setError(res.error)
                return
            }
            toast.success(`سررسید ${nf.format(res.updated)} واژه تغییر کرد`)
            onOpenChange(false)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>تغییر تاریخ سررسید</DialogTitle>
                        <DialogDescription>
                            سررسید {nf.format(wordIds.length)} واژهٔ انتخاب‌شده تغییر می‌کند.
                            {skipped > 0 &&
                                ` ${nf.format(skipped)} واژهٔ یادگرفته‌شده سررسید ندارد و نادیده گرفته می‌شود.`}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="انتخاب سریع">
                            {PRESETS.map((p) => (
                                <Button
                                    key={p.days}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={pending}
                                    onClick={() => setDate(addDays(todayTehran(), p.days))}
                                >
                                    {p.label}
                                </Button>
                            ))}
                        </div>

                        <Field>
                            <FieldLabel htmlFor="due-date">تاریخ سررسید</FieldLabel>
                            <Input
                                id="due-date"
                                type="date"
                                dir="ltr"
                                required
                                min="2000-01-01"
                                max="2100-12-31"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            {date && (
                                <p className="text-xs text-muted-foreground">
                                    {previewFmt.format(new Date(`${date}T00:00:00+03:30`))}
                                </p>
                            )}
                        </Field>

                        <FieldError>{error}</FieldError>
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={!date || !wordIds.length || pending}
                            className="bg-brand-deep"
                        >
                            {pending ? "در حال ذخیره..." : "اعمال"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={pending}
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