"use client"

import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type FilterFn,
  type SortingState,
} from "@tanstack/react-table"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowUpDownIcon, Delete02Icon, Search01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CellEditor, LEVELS } from "@/components/sources/cell-editor"
import { ConfirmDialog } from "@/components/sources/confirm-dialog"
import { AddWordDialog } from "@/components/sources/add-word-dialog"
import { removeWord, updateExample, updateWord } from "@/app/(admin)/sources/[id]/actions"
import type { SourceWordRow } from "@/lib/data/sources"

const dateFmt = new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" })
const nf = new Intl.NumberFormat("fa-IR")

// یکسان‌سازی ی/ک عربی و فارسی برای جستجو
const norm = (v: unknown) =>
  String(v ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک").toLowerCase()

const globalFilterFn: FilterFn<SourceWordRow> = (row, _columnId, value) => {
  const q = norm(value).trim()
  if (!q) return true
  const r = row.original
  return [r.en, r.fa, r.sense, r.example, r.exampleFa].some((v) => norm(v).includes(q))
}

function SortHeader({ column, children }: { column: Column<SourceWordRow>; children: string }) {
  const sorted = column.getIsSorted()
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      aria-label={`مرتب‌سازی بر اساس ${children}`}
    >
      {children}
      <HugeiconsIcon
        icon={ArrowUpDownIcon}
        size={14}
        aria-hidden="true"
        className={sorted ? "text-brand-deep" : "text-muted-foreground"}
      />
      <span className="sr-only">{sorted === "asc" ? "صعودی" : sorted === "desc" ? "نزولی" : ""}</span>
    </button>
  )
}

export function SourceWordsTable({ sourceId, rows }: { sourceId: number; rows: SourceWordRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const columns = useMemo<ColumnDef<SourceWordRow>[]>(
    () => [
      {
        id: "index",
        header: "ردیف",
        enableSorting: false,
        // شمارهٔ ردیف بر اساس ترتیب نمایش فعلی (بعد از جستجو/سورت)
        cell: ({ row, table }) => (
          <span className="text-muted-foreground">
            {nf.format(table.getRowModel().rows.findIndex((r) => r.id === row.id) + 1)}
          </span>
        ),
      },
      {
        id: "en",
        accessorFn: (r) => r.en,
        header: ({ column }) => <SortHeader column={column}>واژه انگلیسی</SortHeader>,
        cell: ({ row: { original: r } }) => (
          <CellEditor
            title="ویرایش واژه انگلیسی"
            fields={[{ name: "en", label: "واژه انگلیسی", value: r.en, dir: "ltr", required: true }]}
            onSave={(v) => updateWord(sourceId, r.wordId, { en: v.en })}
          >
            <span dir="ltr" className="block font-medium">{r.en}</span>
          </CellEditor>
        ),
      },
      {
        id: "fa",
        accessorFn: (r) => r.fa,
        header: ({ column }) => <SortHeader column={column}>ترجمه</SortHeader>,
        cell: ({ row: { original: r } }) => (
          <CellEditor
            title="ویرایش ترجمه"
            fields={[{ name: "fa", label: "ترجمه", value: r.fa, required: true }]}
            onSave={(v) => updateWord(sourceId, r.wordId, { fa: v.fa })}
          >
            {r.fa}
          </CellEditor>
        ),
      },
      {
        id: "example",
        accessorFn: (r) => r.example ?? "",
        header: ({ column }) => <SortHeader column={column}>مثال</SortHeader>,
        cell: ({ row: { original: r } }) => (
          <CellEditor
            title="ویرایش مثال"
            fields={[
              { name: "example", label: "مثال", value: r.example ?? "", dir: "ltr", type: "textarea" },
              { name: "exampleFa", label: "ترجمه مثال", value: r.exampleFa ?? "", type: "textarea" },
            ]}
            onSave={(v) => updateExample(sourceId, r.wordId, { example: v.example, exampleFa: v.exampleFa })}
          >
            {r.example || r.exampleFa ? (
              <>
                <span dir="ltr" className="block text-sm">{r.example}</span>
                <span className="block text-xs text-muted-foreground">{r.exampleFa}</span>
              </>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CellEditor>
        ),
      },
      {
        id: "level",
        accessorFn: (r) => r.level,
        header: ({ column }) => <SortHeader column={column}>سطح</SortHeader>,
        cell: ({ row: { original: r } }) => (
          <CellEditor
            title="ویرایش سطح"
            fields={[{ name: "level", label: "سطح", value: String(r.level), type: "level" }]}
            onSave={(v) => updateWord(sourceId, r.wordId, { level: v.level })}
          >
            <Badge variant="secondary" dir="ltr">{LEVELS[r.level - 1]}</Badge>
          </CellEditor>
        ),
      },
      {
        id: "sense",
        accessorFn: (r) => r.sense ?? "",
        header: ({ column }) => <SortHeader column={column}>sense</SortHeader>,
        cell: ({ row: { original: r } }) => (
          <CellEditor
            title="ویرایش sense"
            fields={[{ name: "sense", label: "sense", value: r.sense ?? "", dir: "ltr" }]}
            onSave={(v) => updateWord(sourceId, r.wordId, { sense: v.sense })}
          >
            {r.sense ? <span dir="ltr">{r.sense}</span> : <span className="text-muted-foreground">—</span>}
          </CellEditor>
        ),
      },
      {
        id: "updatedAt",
        accessorFn: (r) => r.updatedAt,
        header: ({ column }) => <SortHeader column={column}>بروزرسانی</SortHeader>,
        cell: ({ getValue }) => (
          <span dir="ltr" className="text-xs whitespace-nowrap text-muted-foreground">
            {dateFmt.format(new Date(getValue<string>()))}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">عملیات</span>,
        enableSorting: false,
        cell: ({ row: { original: r } }) => (
          <ConfirmDialog
            title="حذف واژه از منبع"
            description={`واژه «${r.en}» از این منبع حذف می‌شود. خودِ واژه در سایر منابع باقی می‌ماند.`}
            confirmLabel="حذف"
            onConfirm={async () => {
              const res = await removeWord(sourceId, r.wordId)
              if (res.ok) toast.success("واژه حذف شد")
              else toast.error(res.error)
            }}
            trigger={
              <Button size="icon-sm" variant="ghost" aria-label={`حذف ${r.en}`}>
                <HugeiconsIcon icon={Delete02Icon} size={18} className="text-destructive" aria-hidden="true" />
              </Button>
            }
          />
        ),
      },
    ],
    [sourceId]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getRowId: (r) => String(r.wordId),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4">
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
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="ps-10"
            />
          </div>
          <AddWordDialog sourceId={sourceId} />
        </div>

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="align-top">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {rows.length ? "واژه‌ای با این جستجو پیدا نشد" : "هنوز واژه‌ای به این منبع اضافه نشده است"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
