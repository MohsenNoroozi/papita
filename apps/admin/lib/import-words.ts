export const MAX_IMPORT_ROWS = 5000

export type ImportRowInput = {
    row: number // شمارهٔ ردیف در فایل (ردیف ۱ = هدر)
    en?: string
    fa?: string
    level?: string
    sense?: string
    example?: string
    exampleFa?: string
}

export type ImportReport = {
    imported: number
    skipped: number // از قبل در منبع بودند یا تکراری در فایل
    invalid: { row: number; reason: string }[]
    invalidCount: number
}