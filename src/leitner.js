// تعداد پیش‌فرض کلمات هر دسته و گزینه‌های قابل انتخاب
export const DECK_SIZE = 10;
export const DECK_SIZE_OPTIONS = [5, 10, 15, 20, 30];

// فاصله مرور هر جعبه (به روز). طول این آرایه = تعداد جعبه‌ها
export const INTERVALS_DAYS = [1, 2, 4, 8, 16];

// تعداد کلمه در هر دسته یادگیری
export const LEARN_BATCH_SIZE = 5;

export const MASTERED = INTERVALS_DAYS.length + 1;

// زمان سررسید: ابتدای روزِ n روز بعد
function dueIn(days, now) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d.getTime();
}

// ورود کلمه به جعبه ۱
export function startEntry(now = Date.now()) {
    return { box: 1, due: dueIn(INTERVALS_DAYS[0], now) };
}

// تعداد ستاره‌های پر (۰ تا stars با گام ۰٫۵) برای یک جعبه
export function starsForBox(box, stars = 5) {
    if (!box || box < 1) return 0;
    if (box >= MASTERED) return stars;
    const raw = (box / INTERVALS_DAYS.length) * stars;
    return Math.max(0.5, Math.round(raw * 2) / 2); // کلمه‌ای که در جعبه است هیچ‌وقت ۰ ستاره نشان داده نمی‌شود
}

// اعمال پاسخ مرور: راست (known=true) یک جعبه جلو، چپ برگشت به جعبه ۱
export function applyAnswer(entry, known, now = Date.now()) {
    const box = entry?.box ?? 1;
    if (!known) return startEntry(now);

    const next = box + 1;
    if (next > INTERVALS_DAYS.length) return { box: MASTERED, due: null };
    return { box: next, due: dueIn(INTERVALS_DAYS[next - 1], now) };
}

export function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// انتخاب دسته (غیرتصادفی): فقط کلمات بیرون از جعبه، به ترتیب «کمتر دیده‌شده‌ها»، بعد id
// seen: { [wordId]: { n: تعداد دفعات دیده‌شدن، at: آخرین زمان } }
export function pickDeck(words, progress, seen, size = DECK_SIZE) {
    return words
        .filter((w) => !progress[w.id])
        .sort((a, b) => (seen[a.id]?.n ?? 0) - (seen[b.id]?.n ?? 0) || a.id - b.id)
        .slice(0, size);
}

// انتخاب دسته مرور: کلمات سررسیدشده؛ اول عقب‌افتاده‌ترین‌ها، بعد id.
// exclude: مجموعه id کلماتی که در این نشست قبلاً آمده‌اند
export function pickDueDeck(words, progress, size = DECK_SIZE, exclude, now = Date.now()) {
    return getDueWords(words, progress, now)
        .filter((w) => !exclude || !exclude.has(w.id))
        .sort((a, b) => progress[a.id].due - progress[b.id].due || a.id - b.id)
        .slice(0, size);
}

// کلماتی که هنوز وارد سیستم نشده‌اند
export function getNewWords(words, progress) {
    return words.filter((w) => !progress[w.id]);
}

// کلماتی که زمان مرورشان رسیده
export function getDueWords(words, progress, now = Date.now()) {
    return words.filter((w) => {
        const p = progress[w.id];
        return p && p.box !== MASTERED && p.due <= now;
    });
}

export function buildReviewQueue(words, progress, now = Date.now()) {
    return shuffle(getDueWords(words, progress, now));
}