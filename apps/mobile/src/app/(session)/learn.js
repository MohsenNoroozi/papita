import React, { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { pickDeck, pickMixedDeck } from '@/leitner';
import LearnSession from '@/components/learn/LearnSession';

// مسیر: /(session)/learn  (ترکیبی از همه منابع)  یا  /(session)/learn?id=14  (یک منبع)
export default function Learn() {
    const router = useRouter();
    const { id, ids } = useLocalSearchParams();
    const isMixed = id == null;
    const sourceId = Number(id);

    const { sources, getSource, getWordsOfSource } = useCatalog();
    const { getProgress, getSeen, markSeen } = useProgress();
    const { level, deckSize } = useSettings();

    const selectedIds = useMemo(() => {
        if (ids == null) return null;
        const values = Array.isArray(ids) ? ids : [ids];
        return new Set(values.flatMap((value) => value.split(',')).map(Number).filter(Number.isFinite));
    }, [ids]);

    const sourceWords = isMixed ? [] : getWordsOfSource(sourceId);

    // شناسه‌های آمده از صفحه منبع عیناً استفاده می‌شوند؛ دسته فقط یک‌بار ساخته می‌شود.
    const words = useMemo(() => {
        if (selectedIds) return sourceWords.filter((word) => selectedIds.has(word.id));
        return isMixed
            ? pickMixedDeck(sources, getWordsOfSource, getProgress(), getSeen(), deckSize, level)
            : pickDeck(sourceWords, getProgress(), getSeen(), deckSize, level);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMixed, selectedIds, sourceWords, sources, getWordsOfSource, deckSize, level]);

    // با خروج از صفحه، کلمات این دسته «دیده‌شده» ثبت می‌شوند تا دسته بعدی سراغ کلمات دیگر برود
    useEffect(
        () => () => markSeen(words.map((w) => w.id)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const title = isMixed ? 'یادگیری' : getSource(sourceId)?.title ?? 'یادگیری';

    return <LearnSession words={words} title={title} onDone={() => router.back()} />;
}
