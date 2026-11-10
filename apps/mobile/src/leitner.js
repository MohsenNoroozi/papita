// تعداد پیش‌فرض کلمات هر دسته و گزینه‌های قابل انتخاب
export const DECK_SIZE = 10;
export const DECK_SIZE_OPTIONS = [5, 10, 15, 20, 30];
// حداکثر کلمات هر دسته در مرور: اگر سررسیدشده‌ها بیش از این باشند، در دسته‌های ۱۰۰تایی می‌آیند؛ وگرنه همه با هم
export const REVIEW_DECK_SIZE = 100;

// فاصله مرور هر جعبه (به روز). طول این آرایه = تعداد جعبه‌ها
export const INTERVALS_DAYS = [1, 2, 4, 8, 16];

// تعداد کلمه در هر دسته یادگیری
export const LEARN_BATCH_SIZE = 5;

export const MASTERED = INTERVALS_DAYS.length + 1;

// ---------- سطح‌ها (هم‌خوان با ستون level دیتابیس: ۱ تا ۶) ----------
export const LEVELS = [1, 2, 3, 4, 5, 6];
export const LEVEL_LABELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const DEFAULT_LEVEL = 1;
export const levelLabel = (n) => LEVEL_LABELS[n - 1] ?? '—';

// کلمه برای سطح کاربر «جدید و مرتبط» است؟ فقط کلمات هم‌سطح یا سخت‌تر.
// کلمه یا کاربر بدون سطح: همیشه بله
export function isForLevel(word, userLevel) {
    if (word.level == null || userLevel == null) return true;
    return word.level >= userLevel;
}

// مرتبط برای آمار و نمایش: کلمه‌ای که در جعبه است همیشه مرتبط حساب می‌شود (حتی اگر زیر سطح باشد)
export function isRelevant(word, progress, userLevel) {
    return !!progress[word.id] || isForLevel(word, userLevel);
}

// ۰ = هم‌سطح کاربر، ۱ = یک پله سخت‌تر، ...
export function levelDistance(word, userLevel) {
    if (word.level == null || userLevel == null) return 0;
    return Math.max(0, word.level - userLevel);
}

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

// انتخاب دسته یادگیری (غیرتصادفی): فقط کلمات بیرون از جعبه و مناسب سطح کاربر.
// ترتیب: ۱) هم‌سطح کاربر اول، بعد سخت‌تر  ۲) کمتر دیده‌شده‌ها  ۳) id
// seen: { [wordId]: { n: تعداد دفعات دیده‌شدن، at: آخرین زمان } }
export function pickDeck(words, progress, seen, size = DECK_SIZE, userLevel) {
    return words
        .filter((w) => !progress[w.id] && isForLevel(w, userLevel))
        .sort(
            (a, b) =>
                levelDistance(a, userLevel) - levelDistance(b, userLevel) ||
                (seen[a.id]?.n ?? 0) - (seen[b.id]?.n ?? 0) ||
                a.id - b.id
        )
        .slice(0, size);
}

// انتخاب دسته مرور: کلمات سررسیدشده؛ اول عقب‌افتاده‌ترین‌ها، بعد id.
// عمداً فیلتر سطح ندارد: کلمه‌ای که در جعبه است همیشه مرور می‌شود.
// exclude: مجموعه id کلماتی که در این نشست قبلاً آمده‌اند
export function pickDueDeck(words, progress, size = DECK_SIZE, exclude, now = Date.now()) {
    return getDueWords(words, progress, now)
        .filter((w) => !exclude || !exclude.has(w.id))
        .sort((a, b) => progress[a.id].due - progress[b.id].due || a.id - b.id)
        .slice(0, size);
}

// انتخاب دسته یادگیری از بین همه منابع: سطح ← تنوع منبع (round-robin) ← کمتر دیده‌شده ← ترتیب منبع
export function pickMixedDeck(sources, getWordsOfSource, progress, seen, size = DECK_SIZE, userLevel) {
    const cands = [];
    sources.forEach((s, si) => {
        const rankByDist = {};
        getWordsOfSource(s.id)
            .filter((w) => !progress[w.id] && isForLevel(w, userLevel))
            .map((w) => ({
                w,
                si,
                dist: levelDistance(w, userLevel),
                n: seen[w.id]?.n ?? 0,
                pos: w._pos ?? w.id,
            }))
            .sort((a, b) => a.dist - b.dist || a.n - b.n || a.pos - b.pos)
            .forEach((c) => {
                // رتبه کلمه داخل منبعش در همان سطح
                c.rank = rankByDist[c.dist] = (rankByDist[c.dist] ?? -1) + 1;
                cands.push(c);
            });
    });

    cands.sort((a, b) => a.dist - b.dist || a.rank - b.rank || a.n - b.n || a.si - b.si);

    const taken = new Set();
    const out = [];
    for (const c of cands) {
        if (out.length >= size) break;
        if (taken.has(c.w.id)) continue;
        taken.add(c.w.id);
        out.push(c.w);
    }
    return out;
}

// کلمات جدیدِ مناسب سطح کاربر که هنوز وارد سیستم نشده‌اند
export function getNewWords(words, progress, userLevel) {
    return words.filter((w) => !progress[w.id] && isForLevel(w, userLevel));
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