"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Add01Icon,
    ArrowUp01Icon,
    Delete02Icon,
    MinusSignIcon,
    Search01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/sources/confirm-dialog"
import {
    changeProgressBox,
    removeProgress,
    type ActionResult,
} from "@/app/(admin)/users/[id]/actions"
import type { UserProgressRow } from "@/lib/data/users"
import { LEARNED_BOX, MIN_BOX } from "@/lib/leitner"
import { levelLabel } from "@/lib/levels"
import { cn } from "@/lib/utils"

type SortKey = "en" | "level" | "box" | "due" | "updatedAt"
type SortDir = "asc" | "desc"

const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "en", label: "واژه" },
    { key: "level", label: "سطح", className: "w-20" },
    { key: "box", label: "پیشرفت", className: "w-64" },
    { key: "due", label: "سررسید", className: "w-36" },
    { key: "updatedAt", label: "بروزرسانی", className: "w-44" },
]

const nf = new Intl.NumberFormat("fa-IR")
const dueFmt = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeZone: "Asia/Tehran" })
const dateFmt = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
})

// یکسان‌سازی ی/ک عربی و فارسی برای جستجو
const norm = (v: unknown) => String(v ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase()

const BOXES = Array.from({ length: LEARNED_BOX }, (_, i) => i + 1)

function BoxBar({ box }: { box: number }) {
    return (
        <div className="flex gap-0.5" aria-hidden="true">
            {BOXES.map((b) => (
                <span
                    key={b}
                    className={cn("h-1.5 w-5 rounded-full", b <= box ? "bg-brand-deep" : "bg-muted")}
                />
            ))}
        </div>
    )
}

export function ProgressTable({ userId, rows }: { userId: string; rows: UserProgressRow[] }) {
    const [query, setQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("due")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [busyId, setBusyId] = useState<number | null>(null)
    const [, startTransition] = useTransition()

    const counts = useMemo(() => {
        const c = new Map<number, number>()
        for (const r of rows) c.set(r.box, (c.get(r.box) ?? 0) + 1)
        return c
    }, [rows])

    const visible = useMemo(() => {
        const q = norm(query).trim()
        const filtered = q ? rows.filter((r) => [r.en, r.fa, r.sense].some((v) => norm(v).includes(q))) : rows

        const factor = sortDir === "asc" ? 1 : -1
        return [...filtered].sort((a, b) => {
            const x = a[sortKey]
            const y = b[sortKey]
            // سررسید خالی (یادگرفته‌شده) همیشه آخر لیست
            if (x == null && y == null) return 0
            if (x == null) return 1
            if (y == null) return -1
            if (sortKey === "due" || sortKey === "updatedAt") {
                return (Date.parse(x as string) - Date.parse(y as string)) * factor
            }
            if (typeof x === "number" && typeof y === "number") return (x - y) * factor
            return String(x).localeCompare(String(y), "en") * factor
        })
    }, [rows, query, sortKey, sortDir])

    function toggleSort(key: SortKey) {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    function run(wordId: number, action: () => Promise<ActionResult>) {
        setBusyId(wordId)
        startTransition(async () => {
            try {
                const res = await action()
                if (!res.ok) toast.error(res.error)
            } finally {
                setBusyId(null)
            }
        })
    }

    return (
        <Card className="shadow-none">
            <CardContent className="space-y-4">
                {/* خلاصهٔ جعبه‌ها */}
                <div className="flex flex-wrap gap-2">
                    {BOXES.map((b) => (
                        <Badge key={b} variant={counts.get(b) ? "secondary" : "outline"} className="gap-1">
                            {b === LEARNED_BOX ? "یادگرفته‌شده" : `جعبه ${nf.format(b)}`}
                            <span className="font-bold">{nf.format(counts.get(b) ?? 0)}</span>
                        </Badge>
                    ))}
                    <Badge variant="outline" className="gap-1">
                        کل <span className="font-bold">{nf.format(rows.length)}</span>
                    </Badge>
                </div>

                <div className="relative w-full max-w-xs">
                    <HugeiconsIcon
                        icon={Search01Icon}
                        size={18}
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-s-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                        type="search"
                        placeholder="جستجو در واژه‌ها..."
                        aria-label="جستجو در واژه‌ها"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="ps-10"
                    />
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            {columns.map((col) => {
                                const active = col.key === sortKey
                                return (
                                    <TableHead
                                        key={col.key}
                                        className={col.className}
                                        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(col.key)}
                                            className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                                        >
                                            {col.label}
                                            <HugeiconsIcon
                                                icon={ArrowUp01Icon}
                                                size={14}
                                                aria-hidden="true"
                                                className={cn(
                                                    "transition-transform",
                                                    active ? "opacity-100" : "opacity-0",
                                                    active && sortDir === "desc" && "rotate-180"
                                                )}
                                            />
                                        </button>
                                    </TableHead>
                                )
                            })}
                            <TableHead className="w-12">
                                <span className="sr-only">عملیات</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {visible.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 1} className="h-24 text-center text-muted-foreground">
                                    {rows.length ? "واژه‌ای با این جستجو پیدا نشد" : "این کاربر هنوز پیشرفتی ندارد"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            visible.map((r) => {
                                const busy = busyId === r.wordId
                                return (
                                    <TableRow key={r.wordId} className={cn("align-middle", busy && "opacity-60")}>
                                        <TableCell>
                                            <span dir="ltr" className="block font-medium">{r.en}</span>
                                            <span className="block text-xs text-muted-foreground">{r.fa}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" dir="ltr">{levelLabel(r.level)}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="icon-sm"
                                                    variant="outline"
                                                    aria-label={`کاهش پیشرفت ${r.en}`}
                                                    disabled={busy || r.box <= MIN_BOX}
                                                    onClick={() => run(r.wordId, () => changeProgressBox(userId, r.wordId, -1))}
                                                >
                                                    <HugeiconsIcon icon={MinusSignIcon} size={16} aria-hidden="true" />
                                                </Button>
                                                <div className="grid min-w-28 gap-1">
                          <span className="text-xs">
                            {r.box === LEARNED_BOX ? "یادگرفته‌شده" : `جعبه ${nf.format(r.box)}`}
                          </span>
                                                    <BoxBar box={r.box} />
                                                </div>
                                                <Button
                                                    size="icon-sm"
                                                    variant="outline"
                                                    aria-label={`افزایش پیشرفت ${r.en}`}
                                                    disabled={busy || r.box >= LEARNED_BOX}
                                                    onClick={() => run(r.wordId, () => changeProgressBox(userId, r.wordId, 1))}
                                                >
                                                    <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {r.due ? (
                                                <span className={cn("text-sm", r.overdue && "font-medium text-destructive")}>
                          {dueFmt.format(new Date(r.due))}
                        </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                      <span dir="ltr" className="inline-block text-xs whitespace-nowrap text-muted-foreground">
                        {dateFmt.format(new Date(r.updatedAt))}
                      </span>
                                        </TableCell>
                                        <TableCell>
                                            <ConfirmDialog
                                                title="حذف از پیشرفت"
                                                description={`واژه «${r.en}» از پیشرفت این کاربر حذف می‌شود و در اپ هم از جعبه‌ها خارج خواهد شد.`}
                                                confirmLabel="حذف"
                                                onConfirm={() => run(r.wordId, () => removeProgress(userId, r.wordId))}
                                                trigger={
                                                    <Button size="icon-sm" variant="ghost" disabled={busy} aria-label={`حذف ${r.en} از پیشرفت`}>
                                                        <HugeiconsIcon icon={Delete02Icon} size={18} className="text-destructive" aria-hidden="true" />
                                                    </Button>
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}