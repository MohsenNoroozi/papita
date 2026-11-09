import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DECK_SIZE, DEFAULT_LEVEL } from '../leitner';

const KEY = 'settings_v1';
const DEFAULTS = {
    autoSpeak: true,
    deckSize: DECK_SIZE,
    level: DEFAULT_LEVEL,    // ۱ تا ۶ (A1 تا C2)
    hideEasySources: false,  // مخفی کردن منابعی که همه کلماتشان زیر سطح کاربر است
};

const Ctx = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULTS);
    const [ready, setReady] = useState(false);
    const ref = useRef(DEFAULTS);

    useEffect(() => {
        (async () => {
            try {
                const raw = await AsyncStorage.getItem(KEY);
                if (raw) {
                    ref.current = { ...DEFAULTS, ...JSON.parse(raw) };
                    setSettings(ref.current);
                }
            } catch {}
            setReady(true);
        })();
    }, []);

    const update = useCallback((patch) => {
        ref.current = { ...ref.current, ...patch };
        setSettings(ref.current);
        AsyncStorage.setItem(KEY, JSON.stringify(ref.current)).catch(() => {});
    }, []);

    const setAutoSpeak = useCallback((value) => update({ autoSpeak: value }), [update]);
    const setDeckSize = useCallback((value) => update({ deckSize: value }), [update]);
    const setLevel = useCallback((value) => update({ level: value }), [update]);
    const setHideEasySources = useCallback((value) => update({ hideEasySources: value }), [update]);

    return (
        <Ctx.Provider
            value={{ ...settings, ready, setAutoSpeak, setDeckSize, setLevel, setHideEasySources }}
        >
            {children}
        </Ctx.Provider>
    );
}

export const useSettings = () => useContext(Ctx);