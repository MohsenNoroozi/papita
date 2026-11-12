"use client"

import { useId, useMemo, useOptimistic, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, DragDropVerticalIcon, Search01Icon } from "@hugeicons/core-free-icons"
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AddSourceDialog } from "./add-source-dialog"
import { reorderSources } from "./actions"

export type SourceRow = {
    id: number
    title: string
    collectionId: number | null
    wordCount: number
}

export type CollectionOption = { id: number; title: string }

const nf = new Intl.NumberFormat("fa-IR")

function SortableSourceRow({
                               source,
                               rank,
                               dragDisabled,
                               onOpen,
                           }: {
    source: SourceRow
    rank: number
    dragDisabled: boolean
    onOpen: () => void
}) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
        useSortable({ id: source.id, disabled: dragDisabled })

    return (
        <TableRow
            ref={setNodeRef}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            className={cn("cursor-pointer", isDragging && "relative z-10 bg-muted shadow-md")}
            onClick={onOpen}
        >
            <TableCell className="w-10 ps-2">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    disabled={dragDisabled}
                    aria-label={`جابه‌جایی ${source.title}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex size-8 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted disabled:opacity-40"
                    {...attributes}
                    {...listeners}
                >
                    <HugeiconsIcon icon={DragDropVerticalIcon} size={18} aria-hidden="true" />
                </button>
            </TableCell>
            <TableCell className="w-20 text-muted-foreground">{nf.format(rank)}</TableCell>
            <TableCell className="font-medium">
                <Link
                    href={`/sources/${source.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:underline"
                >
                    {source.title}
                </Link>
            </TableCell>
            <TableCell className="w-36">{nf.format(source.wordCount)}</TableCell>
        </TableRow>
    )
}

export function SourcesTable({
                                 sources,
                                 collections,
                             }: {
    sources: SourceRow[]
    collections: CollectionOption[]
}) {
    const router = useRouter()
    const dndId = useId() // جلوگیری از hydration mismatch در aria-describedby
    const [, startTransition] = useTransition()

    // پیش‌فرض: آخرین مجموعه
    const [collectionId, setCollectionId] = useState(String(collections.at(-1)?.id ?? ""))
    const [query, setQuery] = useState("")
    const [addOpen, setAddOpen] = useState(false)

    // نمایش آنی ترتیب جدید؛ بعد از پایان action، داده‌ی سرور (revalidate شده) جایگزین می‌شود
    // و اگر action شکست بخورد خودبه‌خود به ترتیب قبلی برمی‌گردد
    const [optimistic, applyOrder] = useOptimistic(sources, (state, next: SourceRow[]) => [
        ...state.filter((s) => s.collectionId !== next[0]?.collectionId),
        ...next,
    ])

    const inCollection = useMemo(
        () => optimistic.filter((s) => String(s.collectionId) === collectionId),
        [optimistic, collectionId]
    )

    const q = query.trim().toLowerCase()
    const rows = useMemo(() => {
        // شماره ردیف جایگاه واقعی در مجموعه است و با جستجو تغییر نمی‌کند
        const ranked = inCollection.map((s, i) => ({ source: s, rank: i + 1 }))
        return q ? ranked.filter(({ source }) => source.title.toLowerCase().includes(q)) : ranked
    }, [inCollection, q])

    // هنگام جستجو لیست ناقص است و جابه‌جایی معنی ندارد
    const dragDisabled = q !== ""

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    function handleDragEnd({ active, over }: DragEndEvent) {
        if (!over || active.id === over.id) return
        const from = inCollection.findIndex((s) => s.id === active.id)
        const to = inCollection.findIndex((s) => s.id === over.id)
        if (from < 0 || to < 0) return

        const next = arrayMove(inCollection, from, to)
        startTransition(async () => {
            applyOrder(next)
            const res = await reorderSources(
                Number(collectionId),
                next.map((s) => s.id)
            )
            if (!res.ok) toast.error(res.error)
        })
    }

    const collectionItems = collections.map((c) => ({ value: String(c.id), label: c.title }))

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-bold">منابع</h1>
                <Button onClick={() => setAddOpen(true)}>
                    <HugeiconsIcon icon={Add01Icon} size={18} aria-hidden="true" />
                    منبع جدید
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <Select
                    items={collectionItems}
                    value={collectionId}
                    onValueChange={(v) => setCollectionId(v ?? "")}
                >
                    <SelectTrigger aria-label="مجموعه" className="w-full sm:w-64">
                        <SelectValue placeholder="انتخاب مجموعه" />
                    </SelectTrigger>
                    <SelectContent>
                        {collectionItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative w-full sm:max-w-xs">
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
            </div>

            <div className="rounded-2xl border">
                <DndContext
                    id={dndId}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleDragEnd}
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10">
                                    <span className="sr-only">جابه‌جایی</span>
                                </TableHead>
                                <TableHead className="w-20">ردیف</TableHead>
                                <TableHead>عنوان</TableHead>
                                <TableHead className="w-36">تعداد کلمات</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                        {q ? "منبعی با این جستجو پیدا نشد" : "این مجموعه هنوز منبعی ندارد"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <SortableContext
                                    items={rows.map(({ source }) => source.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {rows.map(({ source, rank }) => (
                                        <SortableSourceRow
                                            key={source.id}
                                            source={source}
                                            rank={rank}
                                            dragDisabled={dragDisabled}
                                            onOpen={() => router.push(`/sources/${source.id}`)}
                                        />
                                    ))}
                                </SortableContext>
                            )}
                        </TableBody>
                    </Table>
                </DndContext>
            </div>

            <AddSourceDialog
                open={addOpen}
                onOpenChange={setAddOpen}
                collections={collections}
                defaultCollectionId={collectionId}
            />
        </div>
    )
}