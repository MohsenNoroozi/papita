import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { loadProgress, saveProgress, clearProgress } from '../storage';

const DAY_MS = 24 * 60 * 60 * 1000;
const Ctx = createContext(null);

export function ProgressProvider({ children }) {
    const [progress, setProgress] = useState({});
    const [ready, setReady] = useState(false);
    const ref = useRef({});

    useEffect(() => {
        (async () => {
            const p = await loadProgress();
            ref.current = p;
            setProgress(p);
            setReady(true);
        })();
    }, []);

    const getProgress = useCallback(() => ref.current, []);

    const commit = useCallback((next) => {
        ref.current = next;
        setProgress(next);
        saveProgress(next);
    }, []);

    const setEntry = useCallback(
        (id, entry) => commit({ ...ref.current, [id]: entry }),
        [commit]
    );

    // فقط برای تست: همه سررسیدها را n روز جلو می‌آورد
    const shiftDays = useCallback(
        (days) => {
            const next = {};
            for (const [id, e] of Object.entries(ref.current)) {
                next[id] = { ...e, due: e.due == null ? null : e.due - days * DAY_MS };
            }
            commit(next);
        },
        [commit]
    );

    // فقط برای تست: پاک کردن همه پیشرفت‌ها
    const reset = useCallback(() => {
        ref.current = {};
        setProgress({});
        clearProgress();
    }, []);

    return (
        <Ctx.Provider value={{ progress, ready, getProgress, setEntry, shiftDays, reset }}>
            {children}
        </Ctx.Provider>
    );
}

export const useProgress = () => useContext(Ctx);