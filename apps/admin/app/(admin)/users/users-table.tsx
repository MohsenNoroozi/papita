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
import { UserAvatar } from "@/components/users/user-avatar"
import type { UserRow } from "@/lib/data/users"
import { AddUserDialog } from "./add-user-dialog"

type SortKey = "fullname" | "email" | "phone" | "age" | "createdAt" | "updatedAt"
type SortDir = "asc" | "desc"

const columns: { key: SortKey; label: string; className?: string }[] = [
    { key: "fullname", label: "نام" },
    { key: "email", label: "ایمیل" },
    { key: "phone", label: "شماره تلفن" },
    { key: "age", label: "سن", className: "w-24" },
    { key: "createdAt", label: "تاریخ ایجاد", className: "w-44" },
    { key: "updatedAt", label: "تاریخ بروزرسانی", className: "w-44" },
]

const nf = new Intl.NumberFormat("fa-IR")
const dateFmt = new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
})

// یکسان‌سازی ی/ک عربی و فارسی برای جستجو
const norm = (v: unknown) =>
    String(v ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase()

function DateCell({ value }: { value: string }) {
    return (
        <span dir="ltr" className="inline-block text-xs whitespace-nowrap text-muted-foreground">
            {dateFmt.format(new Date(value))}
        </span>
    )
}

export function UsersTable({ users }: { users: UserRow[] }) {
    const router = useRouter()
    const [query, setQuery] = useState("")
    // پیش‌فرض: قدیمی‌ترین کاربر اول (همان ترتیب created_at از سرور)
    const [sortKey, setSortKey] = useState<SortKey>("createdAt")
    const [sortDir, setSortDir] = useState<SortDir>("asc")
    const [addOpen, setAddOpen] = useState(false)

    const rows = useMemo(() => {
        const q = norm(query).trim()
        const filtered = q
            ? users.filter((u) => [u.fullname, u.email, u.phone].some((v) => norm(v).includes(q)))
            : users

        const factor = sortDir === "asc" ? 1 : -1
        return [...filtered].sort((a, b) => {
            const x = a[sortKey]
            const y = b[sortKey]
            // مقدار خالی همیشه آخر لیست
            if (x == null && y == null) return 0
            if (x == null) return 1
            if (y == null) return -1
            if (sortKey === "createdAt" || sortKey === "updatedAt") {
                return (Date.parse(x as string) - Date.parse(y as string)) * factor
            }
            if (typeof x === "number" && typeof y === "number") return (x - y) * factor
            return String(x).localeCompare(String(y), "fa", { numeric: true }) * factor
        })
    }, [users, query, sortKey, sortDir])

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
                        placeholder="جستجوی کاربر..."
                        aria-label="جستجوی کاربر"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="ps-10"
                    />
                </div>

                <Button onClick={() => setAddOpen(true)}>
                    <HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" />
                    کاربر جدید
                </Button>
            </div>

            <div className="rounded-2xl border bg-white">
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
                                    {query ? "کاربری با این جستجو پیدا نشد" : "هنوز کاربری اضافه نشده است"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            rows.map((u) => (
                                <TableRow
                                    key={u.id}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/users/${u.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <UserAvatar src={u.avatarUrl} className="size-9" />
                                            <Link
                                                href={`/users/${u.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                className="font-medium hover:underline"
                                            >
                                                {u.fullname}
                                            </Link>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span dir="ltr" className="inline-block">{u.email}</span>
                                    </TableCell>
                                    <TableCell>
                                        {u.phone ? (
                                            <span dir="ltr" className="inline-block">{u.phone}</span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {u.age != null ? nf.format(u.age) : <span className="text-muted-foreground">—</span>}
                                    </TableCell>
                                    <TableCell>
                                        <DateCell value={u.createdAt} />
                                    </TableCell>
                                    <TableCell>
                                        <DateCell value={u.updatedAt} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddUserDialog open={addOpen} onOpenChange={setAddOpen} />
        </div>
    )
}