import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { wipeLocal } from '../storage';

const LAST_USER_KEY = 'last_user_id';
const Ctx = createContext(null);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let alive = true;

        // اگر کاربر دیگری وارد شد، داده‌های کاربر قبلی روی گوشی پاک شود
        const accept = async (s) => {
            if (s) {
                const last = await AsyncStorage.getItem(LAST_USER_KEY);
                if (last && last !== s.user.id) await wipeLocal();
                await AsyncStorage.setItem(LAST_USER_KEY, s.user.id);
            }
            if (alive) {
                setSession(s);
                setReady(true);
            }
        };

        supabase.auth.getSession().then(({ data }) => accept(data.session));
        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => accept(s));

        // توصیه Supabase برای React Native: refresh توکن فقط وقتی اپ فعال است
        const app = AppState.addEventListener('change', (st) => {
            if (st === 'active') supabase.auth.startAutoRefresh();
            else supabase.auth.stopAutoRefresh();
        });

        return () => {
            alive = false;
            sub.subscription.unsubscribe();
            app.remove();
        };
    }, []);

    // خروجی: null = موفق، وگرنه خطا
    const signIn = useCallback(async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error;
    }, []);

    // صدازننده قبل از آن باید پیشرفت را sync کرده باشد
    const signOut = useCallback(async () => {
        await wipeLocal();
        await supabase.auth.signOut();
    }, []);

    return <Ctx.Provider value={{ session, ready, signIn, signOut }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);