import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import {
    EPOCH,
    loadProgress,
    saveProgress,
    loadSeen,
    saveSeen,
    clearSeen,
    loadSync,
    saveOutbox,
    saveSince,
} from '../storage';
import { startEntry } from '../leitner';

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNC_DELAY_MS = 3000; // چند ثانیه بعد از آخرین تغییر، به سرور فرستاده می‌شود
const Ctx = createContext(null);

export function ProgressProvider({ children }) {
    const [progress, setProgress] = useState({});
    const [seen, setSeen] = useState({});
    const [ready, setReady] = useState(false);

    const ref = useRef({});
    const seenRef = useRef({});
    // تغییرات ارسال‌نشده: { [wordId]: {wordId,box,due,u} | {wordId,deleted:true,u} }
    const outboxRef = useRef({});
    const sinceRef = useRef(EPOCH);
    const syncing = useRef(null);
    const timer = useRef(null);
    const syncNowRef = useRef(null);

    useEffect(() => {
        (async () => {
            const [p, s, sy] = await Promise.all([loadProgress(), loadSeen(), loadSync()]);
            outboxRef.current = sy.outbox;
            sinceRef.current = sy.since;

            // مهاجرت: پیشرفت‌های قدیمی بدون u. با u=1 وارد صف می‌شوند
            // (اگر سرور نسخه جدیدتری داشته باشد، آن برنده است)
            let migrated = false;
            for (const [id, e] of Object.entries(p)) {
                if (e.u == null) {
                    p[id] = { ...e, u: 1 };
                    outboxRef.current[id] = { wordId: Number(id), box: e.box, due: e.due, u: 1 };
                    migrated = true;
                }
            }
            if (migrated) {
                saveProgress(p);
                saveOutbox(outboxRef.current);
            }

            ref.current = p;
            seenRef.current = s;
            setProgress(p);
            setSeen(s);
            setReady(true);
        })();
        return () => clearTimeout(timer.current);
    }, []);

    const getProgress = useCallback(() => ref.current, []);
    const getSeen = useCallback(() => seenRef.current, []);

    // تنها مسیر تغییر پیشرفت: ذخیره محلی + ثبت در صف ارسال + زمان‌بندی sync
    // next باید آبجکت تازه باشد؛ ids = شناسه کلمه‌هایی که تغییر کرده‌اند
    const commit = useCallback((next, ids) => {
        const now = Date.now();
        for (const id of ids) {
            if (next[id]) {
                next[id] = { ...next[id], u: now };
                outboxRef.current[id] = {
                    wordId: Number(id),
                    box: next[id].box,
                    due: next[id].due,
                    u: now,
                };
            } else {
                outboxRef.current[id] = { wordId: Number(id), deleted: true, u: now };
            }
        }
        saveOutbox(outboxRef.current);
        ref.current = next;
        setProgress(next);
        saveProgress(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => syncNowRef.current?.(), SYNC_DELAY_MS);
    }, []);

    const setEntry = useCallback(
        (id, entry) => commit({ ...ref.current, [id]: entry }, [id]),
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
            const added = Object.keys(add);
            if (added.length > 0) commit({ ...ref.current, ...add }, added);
        },
        [commit]
    );

    // حذف کلمه‌ها از همه جعبه‌ها
    const removeFromBoxes = useCallback(
        (ids) => {
            const next = { ...ref.current };
            const removed = [];
            for (const id of ids) {
                if (next[id]) {
                    delete next[id];
                    removed.push(id);
                }
            }
            if (removed.length > 0) commit(next, removed);
        },
        [commit]
    );

    // ثبت اینکه این کلمه‌ها در یک دسته یادگیری به کاربر نشان داده شدند (فقط محلی؛ sync نمی‌شود)
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
            commit(next, Object.keys(next));
        },
        [commit]
    );

    // فقط برای تست: پاک کردن همه پیشرفت‌ها (روی سرور هم پاک می‌شود)
    const reset = useCallback(() => {
        const old = Object.keys(ref.current);
        seenRef.current = {};
        setSeen({});
        clearSeen();
        commit({}, old);
    }, [commit]);

    // ---------- sync با سرور ----------
    const doSync = async () => {
        try {
            const sent = { ...outboxRef.current };
            const { data, error } = await supabase.rpc('sync_progress', {
                changes: Object.values(sent),
                since: sinceRef.current,
            });
            if (error) throw error;

            // اعمال تغییرات سرور؛ نسخه جدیدتر (u بزرگ‌تر) برنده است
            let next = ref.current;
            let changed = false;
            for (const c of data.changes) {
                const localU = outboxRef.current[c.wordId]?.u ?? next[c.wordId]?.u ?? 0;
                if (c.u <= localU) continue;
                if (!changed) {
                    next = { ...next };
                    changed = true;
                }
                if (c.deleted) delete next[c.wordId];
                else next[c.wordId] = { box: c.box, due: c.due, u: c.u };
            }
            if (changed) {
                ref.current = next;
                setProgress(next);
                saveProgress(next);
            }

            // فقط مواردی که همان نسخه ارسال‌شده‌اند از صف پاک شوند
            for (const [id, ch] of Object.entries(sent)) {
                if (outboxRef.current[id]?.u === ch.u) delete outboxRef.current[id];
            }
            saveOutbox(outboxRef.current);
            sinceRef.current = data.nextSince;
            saveSince(data.nextSince);
            return true;
        } catch {
            return false; // آفلاین یا خطا: صف می‌ماند و بعداً ارسال می‌شود
        }
    };

    // اگر sync در جریان باشد همان را برمی‌گرداند. خروجی: true = موفق
    const syncNow = useCallback(() => {
        if (!syncing.current) {
            syncing.current = doSync().finally(() => {
                syncing.current = null;
            });
        }
        return syncing.current;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    syncNowRef.current = syncNow;

    const pendingCount = useCallback(() => Object.keys(outboxRef.current).length, []);

    useEffect(() => {
        if (!ready) return;
        syncNow(); // بعد از بارگذاری
        const sub = AppState.addEventListener('change', (s) => {
            if (s === 'active' || s === 'background') syncNow();
        });
        return () => sub.remove();
    }, [ready, syncNow]);

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
                syncNow,
                pendingCount,
            }}
        >
            {children}
        </Ctx.Provider>
    );
}

export const useProgress = () => useContext(Ctx);