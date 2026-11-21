import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { pickDeck, pickMixedDeck } from '@/leitner';
import LearnSession from '@/components/learn/LearnSession';

// مسیر: /(session)/learn  (ترکیبی از همه منابع)  یا  /(session)/learn?id=14  (یک منبع)
export default function Learn() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const isMixed = id == null;
    const sourceId = Number(id);

    const { sources, getSource, getWordsOfSource } = useCatalog();
    const { getProgress, getSeen, markSeen } = useProgress();
    const { level, deckSize } = useSettings();

    // دسته فقط یک‌بار انتخاب می‌شود تا با تغییر progress وسط کار عوض نشود
    const [words] = useState(() =>
        isMixed
            ? pickMixedDeck(sources, getWordsOfSource, getProgress(), getSeen(), deckSize, level)
            : pickDeck(getWordsOfSource(sourceId), getProgress(), getSeen(), deckSize, level)
    );

    // با خروج از صفحه، کلمات این دسته «دیده‌شده» ثبت می‌شوند تا دسته بعدی سراغ کلمات دیگر برود
    useEffect(
        () => () => markSeen(words.map((w) => w.id)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    const title = isMixed ? 'یادگیری' : getSource(sourceId)?.title ?? 'یادگیری';

    return <LearnSession words={words} title={title} onDone={() => router.back()} />;
}