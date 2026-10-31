import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'settings_v1';
const DEFAULTS = { autoSpeak: true };

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

    return (
        <Ctx.Provider value={{ ...settings, ready, setAutoSpeak }}>
            {children}
        </Ctx.Provider>
    );
}

export const useSettings = () => useContext(Ctx);