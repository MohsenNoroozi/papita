"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Add01Icon,
    ArrowDown01Icon,
    ArrowLeft01Icon,
    ArrowRight01Icon,
    ArrowUp01Icon,
    Delete02Icon,
    MinusSignIcon,
    Search01Icon,
} from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ConfirmDialog } from "@/components/sources/confirm-dialog"
import { AddProgressWordsDialog } from "@/components/users/add-progress-words-dialog"
import { SelectCheckbox } from "@/components/users/select-checkbox"
import {
    changeProgressBox,
    removeProgress,
    setProgressBoxes,
    shiftProgressBoxes,
    type ActionResult,
} from "@/app/(admin)/users/[id]/actions"
import type { UserProgressRow } from "@/lib/data/users"
import { LEARNED_BOX, MIN_BOX } from "@/lib/leitner"
import { levelLabel } from "@/lib/levels"
import { cn } from "@/lib/utils"

type SortKey = "en" | "level" | "box" | "due" | "updatedAt"
type SortDir = "asc" | "desc"

// عرض ستون‌ها ثابت است؛ فقط ستون «واژه» باقی عرض را می‌گیرد
const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "en", label: "واژه" },
    { key: "level", label: "سطح", className: "w-24" },
    { key: "box", label: "پیشرفت", className: "w-64" },
    { key: "due", label: "سررسید", className: "w-36" },
    { key: "updatedAt", label: "بروزرسانی", className: "w-44" },
]

const PAGE_SIZES = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 50

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
const boxTitle = (b: number) => (b === LEARNED_BOX ? "یادگرفته‌شده" : `جعبه ${nf.format(b)}`)

function BoxBar({ box }: { box: number }) {
    return (
        <div className="flex gap-0.5" aria-hidden="true">
            {BOXES.map((b) => (
                <span key={b} className={cn("h-1.5 w-5 rounded-full", b <= box ? "bg-brand-deep" : "bg-muted")} />
            ))}
        </div>
    )
}

// بَج دوخطی فیلتر: تعداد بالا، عنوان پایین
function FilterBadge({
                         count,
                         title,
                         selected,
                         onClick,
                     }: {
    count: number
    title: string
    selected: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className={cn(
                "flex min-w-24 flex-col items-center rounded-xl border px-4 py-2 text-center transition-colors",
                selected
                    ? "border-brand-deep bg-brand-deep text-white"
                    : cn("hover:bg-muted", count === 0 && "text-muted-foreground")
            )}
        >
            <span className="text-xl leading-none font-black">{nf.format(count)}</span>
            <span className={cn("mt-1 text-xs", selected ? "text-white/90" : "text-muted-foreground")}>{title}</span>
        </button>
    )
}

export function ProgressTable({ userId, rows }: { userId: string; rows: UserProgressRow[] }) {
    const [query, setQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("en")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [boxFilter, setBoxFilter] = useState<number | null>(null)
    const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
    const [page, setPage] = useState(0)
    const [selected, setSelected] = useState<Set<number>>(() => new Set())
    const [busyId, setBusyId] = useState<number | null>(null)
    const [pending, startTransition] = useTransition()

    const counts = useMemo(() => {
        const c = new Map<number, number>()
        for (const r of rows) c.set(r.box, (c.get(r.box) ?? 0) + 1)
        return c
    }, [rows])

    const filtered = useMemo(() => {
        const q = norm(query).trim()
        return rows.filter(
            (r) =>
                (boxFilter == null || r.box === boxFilter) &&
                (!q || [r.en, r.fa, r.sense].some((v) => norm(v).includes(q)))
        )
    }, [rows, query, boxFilter])

    const sorted = useMemo(() => {
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
            return String(x).localeCompare(String(y), "en", { sensitivity: "base" }) * factor
        })
    }, [filtered, sortKey, sortDir])

    // صفحه‌بندی
    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
    const currentPage = Math.min(page, pageCount - 1)
    const pageRows = sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    const rangeFrom = sorted.length ? currentPage * pageSize + 1 : 0
    const rangeTo = Math.min(sorted.length, (currentPage + 1) * pageSize)

    // فقط انتخاب‌شده‌هایی که در فیلتر/جستجوی فعلی دیده می‌شوند اعمال می‌شوند
    const selectedIds = useMemo(
        () => filtered.filter((r) => selected.has(r.wordId)).map((r) => r.wordId),
        [filtered, selected]
    )
    const allSelected = filtered.length > 0 && selectedIds.length === filtered.length
    const someSelected = selectedIds.length > 0 && !allSelected

    function updateQuery(v: string) {
        setQuery(v)
        setPage(0)
    }

    function toggleBoxFilter(b: number | null) {
        setBoxFilter((cur) => (cur === b ? null : b))
        setPage(0)
    }

    function toggleSort(key: SortKey) {
        if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        else {
            setSortKey(key)
            setSortDir("asc")
        }
        setPage(0)
    }

    function changePageSize(v: string | null) {
        const n = Number(v)
        if (!PAGE_SIZES.some((s) => s === n)) return
        setPageSize(n)
        setPage(0)
    }

    function toggleAll() {
        setSelected((prev) => {
            const next = new Set(prev)
            if (allSelected) filtered.forEach((r) => next.delete(r.wordId))
            else filtered.forEach((r) => next.add(r.wordId))
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

    function run(action: () => Promise<ActionResult>, opts: { busyId?: number; success?: string } = {}) {
        setBusyId(opts.busyId ?? null)
        startTransition(async () => {
            try {
                const res = await action()
                if (res.ok) {
                    if (opts.success) toast.success(opts.success)
                } else {
                    toast.error(res.error)
                }
            } finally {
                setBusyId(null)
            }
        })
    }

    const shiftSelected = (delta: 1 | -1) =>
        run(() => shiftProgressBoxes(userId, selectedIds, delta), {
            success: `${nf.format(selectedIds.length)} واژه به‌روز شد`,
        })

    const moveSelected = (box: number) =>
        run(() => setProgressBoxes(userId, selectedIds, box), {
            success: `${nf.format(selectedIds.length)} واژه به ${boxTitle(box)} منتقل شد`,
        })

    return (
        <Card className="shadow-none">
            <CardContent className="space-y-4">
                {/* فیلتر بر اساس جعبه: با کلیک دوباره فیلتر برداشته می‌شود */}
                <div className="flex flex-wrap gap-2" role="group" aria-label="فیلتر بر اساس جعبه">
                    <FilterBadge
                        count={rows.length}
                        title="همه"
                        selected={boxFilter === null}
                        onClick={() => toggleBoxFilter(null)}
                    />
                    {BOXES.map((b) => (
                        <FilterBadge
                            key={b}
                            count={counts.get(b) ?? 0}
                            title={boxTitle(b)}
                            selected={boxFilter === b}
                            onClick={() => toggleBoxFilter(b)}
                        />
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
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
                            onChange={(e) => updateQuery(e.target.value)}
                            className="ps-10"
                        />
                    </div>

                    <AddProgressWordsDialog userId={userId} />
                </div>

                {/* نوار عملیات گروهی؛ فقط وقتی واژه‌ای انتخاب شده باشد */}
                {selectedIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-deep/5 p-2 ps-4">
            <span className="me-2 text-sm font-medium">
              {nf.format(selectedIds.length)} واژه انتخاب شده
            </span>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => shiftSelected(1)}>
                            <HugeiconsIcon icon={Add01Icon} size={16} aria-hidden="true" />
                            یک جعبه جلو
                        </Button>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => shiftSelected(-1)}>
                            <HugeiconsIcon icon={MinusSignIcon} size={16} aria-hidden="true" />
                            یک جعبه عقب
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger render={<Button size="sm" variant="outline" disabled={pending} />}>
                                انتقال به جعبه
                                <HugeiconsIcon icon={ArrowDown01Icon} size={16} aria-hidden="true" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {BOXES.map((b) => (
                                    <DropdownMenuItem key={b} onClick={() => moveSelected(b)}>
                                        {boxTitle(b)}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={pending}
                            onClick={() => setSelected(new Set())}
                            className="ms-auto"
                        >
                            لغو انتخاب
                        </Button>
                    </div>
                )}

                <Table className="table-fixed min-w-240">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <SelectCheckbox
                                    checked={allSelected}
                                    indeterminate={someSelected}
                                    disabled={filtered.length === 0 || pending}
                                    label="انتخاب همه / هیچ"
                                    onChange={toggleAll}
                                />
                            </TableHead>
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
                            <TableHead className="w-14">
                                <span className="sr-only">عملیات</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {pageRows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + 2} className="h-24 text-center text-muted-foreground">
                                    {rows.length ? "واژه‌ای با این فیلتر پیدا نشد" : "این کاربر هنوز پیشرفتی ندارد"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            pageRows.map((r) => {
                                const busy = busyId === r.wordId
                                const isSelected = selected.has(r.wordId)
                                return (
                                    <TableRow
                                        key={r.wordId}
                                        className={cn("align-middle", isSelected && "bg-brand-deep/5", busy && "opacity-60")}
                                    >
                                        <TableCell>
                                            <SelectCheckbox
                                                checked={isSelected}
                                                disabled={pending}
                                                label={`انتخاب ${r.en}`}
                                                onChange={() => toggleOne(r.wordId)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span dir="ltr" className="block truncate font-medium">{r.en}</span>
                                            <span className="block truncate text-xs text-muted-foreground">{r.fa}</span>
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
                                                    disabled={pending || r.box <= MIN_BOX}
                                                    onClick={() =>
                                                        run(() => changeProgressBox(userId, r.wordId, -1), { busyId: r.wordId })
                                                    }
                                                >
                                                    <HugeiconsIcon icon={MinusSignIcon} size={16} aria-hidden="true" />
                                                </Button>
                                                <div className="grid min-w-28 gap-1">
                                                    <span className="text-xs">{boxTitle(r.box)}</span>
                                                    <BoxBar box={r.box} />
                                                </div>
                                                <Button
                                                    size="icon-sm"
                                                    variant="outline"
                                                    aria-label={`افزایش پیشرفت ${r.en}`}
                                                    disabled={pending || r.box >= LEARNED_BOX}
                                                    onClick={() =>
                                                        run(() => changeProgressBox(userId, r.wordId, 1), { busyId: r.wordId })
                                                    }
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
                                                onConfirm={() => run(() => removeProgress(userId, r.wordId), { busyId: r.wordId })}
                                                trigger={
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        disabled={pending}
                                                        aria-label={`حذف ${r.en} از پیشرفت`}
                                                    >
                                                        <HugeiconsIcon
                                                            icon={Delete02Icon}
                                                            size={18}
                                                            className="text-destructive"
                                                            aria-hidden="true"
                                                        />
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

                {/* صفحه‌بندی */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                        {sorted.length
                            ? `نمایش ${nf.format(rangeFrom)} تا ${nf.format(rangeTo)} از ${nf.format(sorted.length)} واژه`
                            : "—"}
                    </p>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">تعداد در صفحه</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={changePageSize}
                            items={PAGE_SIZES.map((n) => ({ value: String(n), label: nf.format(n) }))}
                        >
                            <SelectTrigger className="w-24" aria-label="تعداد در صفحه">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAGE_SIZES.map((n) => (
                                    <SelectItem key={n} value={String(n)}>
                                        {nf.format(n)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* در RTL «قبلی» فلش راست و «بعدی» فلش چپ است */}
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="صفحهٔ قبل"
                            disabled={currentPage === 0}
                            onClick={() => setPage(currentPage - 1)}
                        >
                            <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
                        </Button>
                        <span className="min-w-16 text-center text-sm">
              {nf.format(currentPage + 1)} / {nf.format(pageCount)}
            </span>
                        <Button
                            size="icon-sm"
                            variant="outline"
                            aria-label="صفحهٔ بعد"
                            disabled={currentPage >= pageCount - 1}
                            onClick={() => setPage(currentPage + 1)}
                        >
                            <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}