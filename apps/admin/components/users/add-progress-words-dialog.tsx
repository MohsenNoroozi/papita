"use client"

import { useMemo, useRef, useState, useTransition, type FormEvent } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SelectCheckbox } from "@/components/users/select-checkbox"
import { loadAvailableWords, setProgressBoxes } from "@/app/(admin)/users/[id]/actions"
import type { AvailableWord } from "@/lib/data/users"
import { LEARNED_BOX } from "@/lib/leitner"
import { levelLabel } from "@/lib/levels"

const GENERIC = "مشکلی پیش آمد؛ دوباره تلاش کنید"
const MAX_RENDERED = 200 // برای روان ماندن لیست؛ بقیه با جستجو پیدا می‌شوند

const nf = new Intl.NumberFormat("fa-IR")
const boxTitle = (b: number) => (b === LEARNED_BOX ? "یادگرفته‌شده" : `جعبه ${nf.format(b)}`)
const BOX_ITEMS = Array.from({ length: LEARNED_BOX }, (_, i) => ({
    value: String(i + 1),
    label: boxTitle(i + 1),
}))

// یکسان‌سازی ی/ک عربی و فارسی برای جستجو
const norm = (v: unknown) => String(v ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase()

export function AddProgressWordsDialog({ userId }: { userId: string }) {
    const [open, setOpen] = useState(false)
    const [words, setWords] = useState<AvailableWord[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [selected, setSelected] = useState<Set<number>>(() => new Set())
    const [box, setBox] = useState("1")
    const [pending, startTransition] = useTransition()
    const loadToken = useRef(0)

    const filtered = useMemo(() => {
        if (!words) return []
        const q = norm(query).trim()
        return q ? words.filter((w) => [w.en, w.fa, w.sense].some((v) => norm(v).includes(q))) : words
    }, [words, query])

    // فقط انتخاب‌شده‌هایی که در جستجوی فعلی دیده می‌شوند اعمال می‌شوند
    const chosen = useMemo(
        () => filtered.filter((w) => selected.has(w.id)).map((w) => w.id),
        [filtered, selected]
    )
    const allChosen = filtered.length > 0 && chosen.length === filtered.length
    const someChosen = chosen.length > 0 && !allChosen

    function handleOpenChange(next: boolean) {
        if (pending) return
        setOpen(next)
        if (!next) {
            loadToken.current++ // نتیجهٔ درخواست در حال انجام نادیده گرفته شود
            return
        }

        setWords(null)
        setLoadError(null)
        setQuery("")
        setSelected(new Set())
        setBox("1")

        const token = ++loadToken.current
        loadAvailableWords(userId)
            .then((res) => {
                if (token !== loadToken.current) return
                if (res.ok) setWords(res.words)
                else setLoadError(res.error)
            })
            .catch(() => {
                if (token === loadToken.current) setLoadError(GENERIC)
            })
    }

    function toggleAll() {
        setSelected((prev) => {
            const next = new Set(prev)
            if (allChosen) filtered.forEach((w) => next.delete(w.id))
            else filtered.forEach((w) => next.add(w.id))
            return next
        })
    }

    function toggleOne(id: number) {
        setSelected((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!chosen.length || pending) return

        startTransition(async () => {
            const res = await setProgressBoxes(userId, chosen, Number(box))
            if (!res.ok) {
                toast.error(res.error)
                return
            }
            toast.success(`${nf.format(chosen.length)} واژه به ${boxTitle(Number(box))} اضافه شد`)
            setOpen(false)
        })
    }

    const visible = filtered.slice(0, MAX_RENDERED)

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger render={<Button type="button" className="bg-brand-deep" />}>
                <HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" />
                افزودن واژه به جعبه
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>افزودن واژه به جعبه</DialogTitle>
                        <DialogDescription>
                            واژه‌هایی که هنوز در هیچ جعبه‌ای از این کاربر نیستند. واژه‌ها را انتخاب کنید و جعبهٔ مقصد را مشخص کنید.
                        </DialogDescription>
                    </DialogHeader>

                    <Input
                        type="search"
                        placeholder="جستجو در واژه‌ها..."
                        aria-label="جستجو در واژه‌ها"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={!words}
                    />

                    <div className="rounded-lg border">
                        <div className="flex items-center gap-3 border-b px-3 py-2 text-sm">
                            <SelectCheckbox
                                checked={allChosen}
                                indeterminate={someChosen}
                                disabled={!filtered.length}
                                label="انتخاب همه"
                                onChange={toggleAll}
                            />
                            <span className="text-muted-foreground">
                {words
                    ? `${nf.format(chosen.length)} انتخاب شده از ${nf.format(filtered.length)} واژه`
                    : "در حال بارگذاری..."}
              </span>
                        </div>

                        <div className="max-h-72 divide-y overflow-y-auto">
                            {loadError ? (
                                <p className="p-6 text-center text-sm text-destructive">{loadError}</p>
                            ) : !words ? (
                                <p className="p-6 text-center text-sm text-muted-foreground">در حال بارگذاری...</p>
                            ) : visible.length === 0 ? (
                                <p className="p-6 text-center text-sm text-muted-foreground">
                                    {words.length ? "واژه‌ای با این جستجو پیدا نشد" : "همهٔ واژه‌ها در جعبه‌های این کاربر هستند"}
                                </p>
                            ) : (
                                visible.map((w) => (
                                    <label
                                        key={w.id}
                                        className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50"
                                    >
                                        <SelectCheckbox
                                            checked={selected.has(w.id)}
                                            label={`انتخاب ${w.en}`}
                                            onChange={() => toggleOne(w.id)}
                                        />
                                        <span className="min-w-0 flex-1">
                      <span dir="ltr" className="block truncate font-medium">
                        {w.en}
                          {w.sense && <span className="ms-2 text-xs text-muted-foreground">({w.sense})</span>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{w.fa}</span>
                    </span>
                                        <Badge variant="secondary" dir="ltr">{levelLabel(w.level)}</Badge>
                                    </label>
                                ))
                            )}
                        </div>

                        {filtered.length > MAX_RENDERED && (
                            <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                                فقط {nf.format(MAX_RENDERED)} واژهٔ اول نمایش داده می‌شود؛ برای دیدن بقیه جستجو کنید. «انتخاب همه» همهٔ{" "}
                                {nf.format(filtered.length)} واژه را انتخاب می‌کند.
                            </p>
                        )}
                    </div>

                    <Field>
                        <FieldLabel htmlFor="add-progress-box">جعبهٔ مقصد</FieldLabel>
                        <Select items={BOX_ITEMS} value={box} onValueChange={(v) => setBox(v ?? "1")}>
                            <SelectTrigger id="add-progress-box" className="w-full">
                                <SelectValue placeholder="انتخاب جعبه" />
                            </SelectTrigger>
                            <SelectContent>
                                {BOX_ITEMS.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>

                    <DialogFooter>
                        <Button type="submit" disabled={!chosen.length || pending} className="bg-brand-deep">
                            {pending ? "در حال ذخیره..." : `افزودن${chosen.length ? ` (${nf.format(chosen.length)})` : ""}`}
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