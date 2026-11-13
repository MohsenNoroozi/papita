// آخرین جعبهٔ واقعی؛ جعبهٔ بعد از آن یعنی «کاملاً یادگرفته» (due = null)
export const LEARNED_BOX = 6
export const MIN_BOX = 1

// فاصلهٔ مرور هر جعبه بر حسب روز. اگر اپ فاصله‌های دیگری دارد فقط همین‌جا عوض کنید.
const BOX_INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 15 }

// سررسید جعبه: ابتدای امروز (UTC، مثل seeder) + فاصلهٔ جعبه؛ برای «یادگرفته‌شده» null
export function dueForBox(box: number): Date | null {
    const days = BOX_INTERVAL_DAYS[box]
    if (days === undefined) return null
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() + days)
    return d
}