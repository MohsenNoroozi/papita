import { MASTERED } from '@/leitner';

const DAY_MS = 24 * 60 * 60 * 1000;

// آبجکت‌های ثابت: مقایسه و memo ردیف‌ها بدون ساخت آبجکت جدید انجام می‌شود
export const STATUS_NEW = Object.freeze({ kind: 'new', days: 0, isDue: false });
export const STATUS_DUE = Object.freeze({ kind: 'due', days: 0, isDue: true });
export const STATUS_OVERDUE = Object.freeze({ kind: 'overdue', days: 0, isDue: true });
export const STATUS_MASTERED = Object.freeze({ kind: 'mastered', days: 0, isDue: false });

const laterCache = new Map();
function laterStatus(days) {
    let s = laterCache.get(days);
    if (!s) {
        s = Object.freeze({ kind: 'later', days, isDue: false });
        laterCache.set(days, s);
    }
    return s;
}

export function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

// kind: new | due | overdue | later | mastered
// due = سررسید امروز، overdue = سررسید قبل از امروز
export function getReviewStatus(entry, now = Date.now(), today = startOfDay(now)) {
    if (!entry) return STATUS_NEW;
    if (entry.box === MASTERED) return STATUS_MASTERED;
    if (entry.due == null || entry.due <= now) {
        return entry.due != null && entry.due < today ? STATUS_OVERDUE : STATUS_DUE;
    }
    return laterStatus(Math.max(1, Math.round((entry.due - today) / DAY_MS)));
}

export function statusLabel(s) {
    switch (s.kind) {
        case 'new': return 'جدید';
        case 'due':
        case 'overdue': return 'آماده مرور';
        case 'mastered': return 'در حافظه من';
        default: return 'مرور: ' + (s.days === 1 ? 'فردا' : `${s.days} روز دیگر`);
    }
}