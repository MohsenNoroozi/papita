"use client"

import { useState, useTransition, type ChangeEvent } from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Upload01Icon } from "@hugeicons/core-free-icons"
import Papa from "papaparse"
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
import { importWords } from "@/app/(admin)/sources/[id]/actions"
import { MAX_IMPORT_ROWS, type ImportReport, type ImportRowInput } from "@/lib/import-words"

const nf = new Intl.NumberFormat("fa-IR")

const HEADER_MAP: Record<string, keyof Omit<ImportRowInput, "row">> = {
    en: "en",
    fa: "fa",
    level: "level",
    example: "example",
    examplefa: "exampleFa",
    sense: "sense",
}
const REQUIRED = ["en", "fa", "level"] as const
const normHeader = (h: string) => h.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[\s_-]/g, "")

async function parseImportFile(file: File): Promise<ImportRowInput[]> {
    // file.text() فایل را UTF-8 می‌خواند و BOM را هم حذف می‌کند
    const text = await file.text()

    const { data, errors } = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: "greedy", // ردیف‌های خالی یا فقط-کاما نادیده گرفته می‌شوند
        transformHeader: normHeader,
    })

    // خطاهای ساختاری (مثل کوتیشن ناقص)؛ تفاوت تعداد ستون‌ها را تحمل می‌کنیم
    const fatal = errors.find((e) => e.type === "Quotes")
    if (fatal) throw new Error(`فایل CSV معتبر نیست (ردیف ${nf.format((fatal.row ?? 0) + 2)})`)

    if (!data.length) throw new Error("فایل ردیفی ندارد")

    const present = new Set(Object.keys(data[0]).map((h) => HEADER_MAP[h]))
    const missing = REQUIRED.filter((k) => !present.has(k))
    if (missing.length) throw new Error(`ستون‌های الزامی پیدا نشد: ${missing.join("، ")}`)

    const rows: ImportRowInput[] = data.map((r, i) => {
        const entry: ImportRowInput = { row: i + 2 } // ردیف ۱ = هدر
        for (const [header, value] of Object.entries(r)) {
            const key = HEADER_MAP[header]
            if (key) entry[key] = String(value ?? "").trim()
        }
        return entry
    })

    if (rows.length > MAX_IMPORT_ROWS) {
        throw new Error(`حداکثر ${nf.format(MAX_IMPORT_ROWS)} ردیف در هر بار ایمپورت مجاز است`)
    }
    return rows
}

export function ImportWordsDialog({ sourceId }: { sourceId: number }) {
    const [open, setOpen] = useState(false)
    const [rows, setRows] = useState<ImportRowInput[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [report, setReport] = useState<ImportReport | null>(null)
    const [pending, startTransition] = useTransition()

    function reset() {
        setRows(null)
        setError(null)
        setReport(null)
    }

    function handleOpenChange(next: boolean) {
        if (pending) return
        setOpen(next)
        if (!next) reset()
    }

    async function handleFile(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        reset()
        if (!file) return
        try {
            setRows(await parseImportFile(file))
        } catch (err) {
            setError(err instanceof Error ? err.message : "فایل خوانده نشد")
        }
    }

    function handleImport() {
        if (!rows || pending) return
        startTransition(async () => {
            const res = await importWords(sourceId, rows)
            if (!res.ok) {
                toast.error(res.error)
                return
            }
            setReport(res.report)
            setRows(null)
        })
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                render={
                    <Button variant="outline">
                        <HugeiconsIcon icon={Upload01Icon} size={18} aria-hidden="true" />
                        ایمپورت از فایل
                    </Button>
                }
            />
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>ایمپورت واژه‌ها</DialogTitle>
                    <DialogDescription>
                        فایل CSV با کدگذاری UTF-8. ستون‌های الزامی: <span dir="ltr">en, fa, level</span>؛ اختیاری:{" "}
                        <span dir="ltr">example, exampleFa, sense</span>. سطح می‌تواند A1 تا C2 یا ۱ تا ۶ باشد. واژه‌ای که
                        از قبل در این منبع باشد نادیده گرفته می‌شود.
                    </DialogDescription>
                </DialogHeader>

                {report ? (
                    <ReportView report={report} />
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="import-file">فایل</Label>
                        <Input
                            id="import-file"
                            type="file"
                            accept=".csv,text/csv"
                            disabled={pending}
                            onChange={handleFile}
                        />
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        {rows && (
                            <p className="text-sm text-muted-foreground">
                                {nf.format(rows.length)} ردیف خوانده شد و آمادهٔ ایمپورت است.
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    {!report && (
                        <Button onClick={handleImport} disabled={!rows || pending} className="bg-brand-deep">
                            {pending ? "در حال ایمپورت..." : "ایمپورت"}
                        </Button>
                    )}
                    <Button variant="outline" disabled={pending} onClick={() => handleOpenChange(false)}>
                        بستن
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function ReportView({ report }: { report: ImportReport }) {
    const stats = [
        { label: "ایمپورت شد", value: report.imported, className: "text-brand-accent" },
        { label: "نادیده گرفته شد (تکراری)", value: report.skipped, className: "text-foreground" },
        { label: "نامعتبر", value: report.invalidCount, className: "text-destructive" },
    ]

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                {stats.map((s) => (
                    <div key={s.label} className="rounded-xl border p-3 text-center">
                        <div className={`text-2xl font-black ${s.className}`}>{nf.format(s.value)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                    </div>
                ))}
            </div>

            {report.invalidCount > 0 && (
                <div className="space-y-1.5">
                    <p className="text-sm font-medium">ردیف‌های نامعتبر (شمارهٔ ردیف در فایل)</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3 text-sm">
                        {report.invalid.map((r) => (
                            <li key={r.row}>
                                <span className="text-muted-foreground">{nf.format(r.row)}:</span> {r.reason}
                            </li>
                        ))}
                        {report.invalidCount > report.invalid.length && (
                            <li className="text-muted-foreground">
                                و {nf.format(report.invalidCount - report.invalid.length)} مورد دیگر...
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    )
}