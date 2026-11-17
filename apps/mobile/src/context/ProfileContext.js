import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { avatarPath } from '@/lib/avatar';

const Ctx = createContext(null);
const COLS = 'fullname,email,phone,age,avatar_url,level,updated_at';
const CACHE_KEY = 'profile_v1';
const MIN_GAP_MS = 60_000; // حداکثر دقیقه‌ای یک بار refresh خودکار

export function ProfileProvider({ children }) {
    const { session } = useAuth();
    const user = session.user;
    const [profile, setProfile] = useState(null);
    const ref = useRef(null); // آخرین پروفایل (برای استفاده در callbackها بدون stale closure)
    const last = useRef(0);

    // اعمال یک نسخه جدید: state + ref + کش محلی
    const apply = useCallback(
        (data) => {
            ref.current = data;
            setProfile(data);
            AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ userId: user.id, data })).catch(() => {});
        },
        [user.id]
    );

    // دریافت از سرور. خروجی: true = موفق، false = آفلاین/خطا
    const refresh = useCallback(
        async (force = false) => {
            if (!force && Date.now() - last.current < MIN_GAP_MS) return true;
            last.current = Date.now();
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select(COLS)
                    .eq('id', user.id)
                    .single();
                if (error) throw error;
                // فقط اگر نسخه سرور جدیدتر از نسخه فعلی است (از رندر اضافه و بازنویسی با پاسخ قدیمی جلوگیری می‌کند)
                const cur = ref.current;
                if (data && (!cur?.updated_at || data.updated_at > cur.updated_at)) apply(data);
                return true;
            } catch {
                return false; // آفلاین: همان نسخه محلی می‌ماند
            }
        },
        [user.id, apply]
    );

    useEffect(() => {
        let alive = true;
        (async () => {
            // ۱) فوراً نسخه محلی (فقط اگر مال همین کاربر باشد)
            try {
                const raw = await AsyncStorage.getItem(CACHE_KEY);
                if (raw && alive) {
                    const cached = JSON.parse(raw);
                    if (cached?.userId === user.id && cached.data && !ref.current) {
                        ref.current = cached.data;
                        setProfile(cached.data);
                    }
                }
            } catch {}
            // ۲) در پس‌زمینه از سرور
            if (alive) refresh(true);
        })();

        const sub = AppState.addEventListener('change', (s) => {
            if (s === 'active') refresh();
        });
        return () => {
            alive = false;
            sub.remove();
        };
    }, [user.id, refresh]);

    // خروجی: null = موفق، وگرنه خطا
    const updateProfile = useCallback(
        async (patch) => {
            const { data, error } = await supabase
                .from('profiles')
                .update(patch)
                .eq('id', user.id)
                .select(COLS)
                .single();
            if (error) return error;
            apply(data);
            return null;
        },
        [user.id, apply]
    );

    // base64: عکس JPEG که قبلاً کوچک شده؛ خروجی: null = موفق، وگرنه خطا
    const uploadAvatar = useCallback(
        async (base64) => {
            try {
                const oldAvatar = ref.current?.avatar_url;
                const path = `${user.id}/${Date.now()}.jpg`; // اسم جدید = کش تصویر نامعتبر می‌شود
                const { error } = await supabase.storage
                    .from('avatars')
                    .upload(path, decode(base64), { contentType: 'image/jpeg' });
                if (error) return error;

                const err = await updateProfile({ avatar_url: path }); // فقط مسیر
                if (err) return err;

                // پاک کردن فایل قبلی (اگر مال خود کاربر بود)
                const old = avatarPath(oldAvatar);
                if (old && old !== path && old.startsWith(`${user.id}/`)) {
                    supabase.storage.from('avatars').remove([old]).catch(() => {});
                }
                return null;
            } catch (e) {
                return e;
            }
        },
        [user.id, updateProfile]
    );

    const value = useMemo(
        () => ({
            profile,
            email: profile?.email ?? user.email,
            updateProfile,
            uploadAvatar,
            refresh: () => refresh(true), // خروجی: true = موفق
        }),
        [profile, user.email, updateProfile, uploadAvatar, refresh]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProfile = () => useContext(Ctx);