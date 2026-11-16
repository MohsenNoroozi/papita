
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const AUTH_STORAGE_KEY = 'papita-auth';

// SSR-safe storage for Supabase Auth
const authStorage = {
    getItem: async (key) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return null;
            return window.localStorage.getItem(key);
        }

        return AsyncStorage.getItem(key);
    },

    setItem: async (key, value) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(key, value);
            return;
        }

        await AsyncStorage.setItem(key, value);
    },

    removeItem: async (key) => {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return;
            window.localStorage.removeItem(key);
            return;
        }

        await AsyncStorage.removeItem(key);
    },
};

export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    {
        auth: {
            storage: authStorage,
            storageKey: AUTH_STORAGE_KEY,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        }
    }
);
