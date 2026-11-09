import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { loadCatalog, syncCatalog } from '../data/catalogStore';

const Ctx = createContext(null);
const MIN_GAP_MS = 60_000; // حداکثر دقیقه‌ای یک بار sync خودکار

export function CatalogProvider({ children }) {
    const [cat, setCat] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | ok | error
    const catRef = useRef(null);
    const last = useRef(0);

    const sync = useCallback(async (force = false) => {
        if (!catRef.current) return;
        if (!force && Date.now() - last.current < MIN_GAP_MS) return;
        last.current = Date.now();
        try {
            const fresh = await syncCatalog(catRef.current);
            catRef.current = fresh;
            setCat(fresh);
            setStatus('ok');
        } catch {
            setStatus('error'); // آفلاین: اگر کاتالوگ محلی دارد مشکلی نیست
        }
    }, []);

    useEffect(() => {
        let alive = true;
        (async () => {
            const local = await loadCatalog();
            if (!alive) return;
            catRef.current = local;
            setCat(local); // ۱) فوراً محتوای محلی
            sync(true);    // ۲) در پس‌زمینه فقط تغییرات
        })();
        const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
        return () => {
            alive = false;
            sub.remove();
        };
    }, [sync]);

    const value = useMemo(() => {
        const base = {
            status,
            retry: () => sync(true),
            ready: false,
            words: [],
            sources: [],
            getSource: () => undefined,
            getWordsOfSource: () => [],
        };
        if (!cat) return base;
        const words = Object.values(cat.words);
        if (words.length === 0) return base; // بار اول و هنوز دانلود نشده

        // کلمات هر منبع، با مثالِ همان منبع
        const bySource = new Map();
        for (const sw of Object.values(cat.sourceWords)) {
            const w = cat.words[sw.wordId];
            if (!w) continue;
            if (!bySource.has(sw.sourceId)) bySource.set(sw.sourceId, []);
            bySource.get(sw.sourceId).push({
                ...w,
                example: sw.example,
                exampleFa: sw.exampleFa,
                sourceId: sw.sourceId,
                _pos: sw.position ?? w.id,
            });
        }
        for (const list of bySource.values()) list.sort((a, b) => a._pos - b._pos || a.id - b.id);

        const sources = Object.values(cat.sources).sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
        const sm = new Map(sources.map((s) => [s.id, s]));

        return {
            ...base,
            ready: true,
            words,
            sources,
            getSource: (id) => sm.get(id),
            getWordsOfSource: (id) => bySource.get(id) ?? [],
        };
    }, [cat, status, sync]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCatalog = () => useContext(Ctx);