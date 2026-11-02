import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
    loadProgress,
    saveProgress,
    clearProgress,
    loadSeen,
    saveSeen,
    clearSeen,
} from '../storage';
import { startEntry } from '../leitner';

const DAY_MS = 24 * 60 * 60 * 1000;
const Ctx = createContext(null);

export function ProgressProvider({ children }) {
    const [progress, setProgress] = useState({});
    const [seen, setSeen] = useState({});
    const [ready, setReady] = useState(false);
    const ref = useRef({});
    const seenRef = useRef({});

    useEffect(() => {
        (async () => {
            const [p, s] = await Promise.all([loadProgress(), loadSeen()]);
            ref.current = p;
            seenRef.current = s;
            setProgress(p);
            setSeen(s);
            setReady(true);
        })();
    }, []);

    const getProgress = useCallback(() => ref.current, []);
    const getSeen = useCallback(() => seenRef.current, []);

    const commit = useCallback((next) => {
        ref.current = next;
        setProgress(next);
        saveProgress(next);
    }, []);

    const setEntry = useCallback(
        (id, entry) => commit({ ...ref.current, [id]: entry }),
        [commit]
    );

    // انتقال کلمه‌ها به جعبه ۱ (کلمه‌هایی که از قبل در جعبه‌اند دست نمی‌خورند)
    const addToBox1 = useCallback(
        (ids) => {
            const now = Date.now();
            const add = {};
            for (const id of ids) {
                if (!ref.current[id]) add[id] = startEntry(now);
            }
            if (Object.keys(add).length > 0) commit({ ...ref.current, ...add });
        },
        [commit]
    );

    // حذف کلمه‌ها از همه جعبه‌ها
    const removeFromBoxes = useCallback(
        (ids) => {
            const next = { ...ref.current };
            let changed = false;
            for (const id of ids) {
                if (next[id]) {
                    delete next[id];
                    changed = true;
                }
            }
            if (changed) commit(next);
        },
        [commit]
    );

    // ثبت اینکه این کلمه‌ها در یک دسته یادگیری به کاربر نشان داده شدند (یک بار برای هر دسته)
    const markSeen = useCallback((ids) => {
        if (!ids || ids.length === 0) return;
        const now = Date.now();
        const next = { ...seenRef.current };
        for (const id of ids) {
            next[id] = { n: (next[id]?.n ?? 0) + 1, at: now };
        }
        seenRef.current = next;
        setSeen(next);
        saveSeen(next);
    }, []);

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
        seenRef.current = {};
        setProgress({});
        setSeen({});
        clearProgress();
        clearSeen();
    }, []);

    return (
        <Ctx.Provider
            value={{
                progress,
                seen,
                ready,
                getProgress,
                getSeen,
                setEntry,
                addToBox1,
                removeFromBoxes,
                markSeen,
                shiftDays,
                reset,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export const useProgress = () => useContext(Ctx);