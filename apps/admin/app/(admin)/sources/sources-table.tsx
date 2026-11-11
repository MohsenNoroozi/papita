"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, ArrowUp01Icon, Search01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { AddSourceDialog } from "./add-source-dialog"

export type SourceRow = {
    id: number
    title: string
    collectionTitle: string
    wordCount: number
}

export type CollectionOption = { id: number; title: string }

type SortKey = "id" | "title" | "collectionTitle" | "wordCount"
type SortDir = "asc" | "desc"

const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "id", label: "شناسه", className: "w-24" },
    { key: "title", label: "عنوان" },
    { key: "collectionTitle", label: "مجموعه" },
    { key: "wordCount", label: "تعداد کلمات", className: "w-36" },
]

export function SourcesTable({
                                 sources,
                                 collections,
                             }: {
    sources: SourceRow[]
    collections: CollectionOption[]
}) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("id")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [addOpen, setAddOpen] = useState(false)

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase()
        const filtered = q
            ? sources.filter(
                (s) =>
                    s.title.toLowerCase().includes(q) ||
                    s.collectionTitle.toLowerCase().includes(q)
            )
            : sources

        const factor = sortDir === "asc" ? 1 : -1
        return [...filtered].sort((a, b) => {
            const x = a[sortKey]
            const y = b[sortKey]
            if (typeof x === "number" && typeof y === "number") return (x - y) * factor
            return String(x).localeCompare(String(y), undefined, { numeric: true }) * factor
        })
    }, [sources, query, sortKey, sortDir])

    function toggleSort(key: SortKey) {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("asc")
        }
    }

    return (
        <div className="space-y-4">
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
                        placeholder="جستجوی منبع..."
                        aria-label="جستجوی منبع"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="ps-10"
                    />
                </div>

                <Button onClick={() => setAddOpen(true)}>
                    <HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" />
                    منبع جدید
                </Button>
            </div>

            <div className="rounded-2xl border">
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
                                                className={[
                                                    "transition-transform",
                                                    active ? "opacity-100" : "opacity-0",
                                                    active && sortDir === "desc" ? "rotate-180" : "",
                                                ].join(" ")}
                                            />
                                        </button>
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                                    {query ? "منبعی با این جستجو پیدا نشد" : "هنوز منبعی اضافه نشده است"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((s) => (
                                <TableRow
                                    key={s.id}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/sources/${s.id}`)}
                                >
                                    <TableCell className="text-muted-foreground">{s.id}</TableCell>
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/sources/${s.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="hover:underline"
                                        >
                                            {s.title}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{s.collectionTitle}</TableCell>
                                    <TableCell>{s.wordCount}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddSourceDialog open={addOpen} onOpenChange={setAddOpen} collections={collections} />
        </div>
    )
}