import { useMemo } from 'react';
import { isForLevel } from '@/leitner';
import { getReviewStatus, startOfDay } from '@/lib/reviewStatus';

export default function useSourceWords(words, progress, level) {
    return useMemo(() => {
        const now = Date.now();
        const today = startOfDay(now);
        const fresh = [];
        const boxed = [];
        const byId = new Map();
        let dueCount = 0;
        let learnableCount = 0;

        for (const w of words) {
            const entry = progress[w.id];
            const status = getReviewStatus(entry, now, today);
            const learnable = !entry && isForLevel(w, level);
            const row = {
                id: w.id,
                en: w.en,
                fa: w.fa,
                box: entry?.box,
                status,
                learnable,
                dimmed: !entry && !learnable, // پایین‌تر از سطح و بیرون از جعبه
            };
            byId.set(w.id, row);
            if (status.isDue) dueCount += 1;
            if (learnable) learnableCount += 1;
            (entry ? boxed : fresh).push(row);
        }

        // کلمات بدون جعبه اول؛ ترتیب منبع حفظ می‌شود
        return { items: fresh.concat(boxed), byId, dueCount, learnableCount };
    }, [words, progress, level]);
}