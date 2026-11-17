import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert } from 'react-native';
import { useCatalog } from '@/context/CatalogContext';
import { useProgress } from '@/context/ProgressContext';
import { useProfile } from '@/context/ProfileContext';

const Ctx = createContext(null);

export function RefreshProvider({ children }) {
    const { refresh: refreshCatalog } = useCatalog();
    const { refresh: refreshProfile } = useProfile();
    const { syncNow } = useProgress();
    const [refreshing, setRefreshing] = useState(false);

    const refreshAll = useCallback(async () => {
        if (refreshing) return false;
        setRefreshing(true);
        try {
            const [progressOk, catalogOk, profileOk] = await Promise.all([
                syncNow(),
                refreshCatalog(),
                refreshProfile(),
            ]);
            if (!progressOk || !catalogOk || !profileOk) {
                Alert.alert('به‌روزرسانی نشد', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کن.');
                return false;
            }
            return true;
        } catch {
            Alert.alert('به‌روزرسانی نشد', 'اتصال به سرور برقرار نشد. اینترنت را بررسی کن.');
            return false;
        } finally {
            setRefreshing(false);
        }
    }, [refreshCatalog, refreshProfile, refreshing, syncNow]);

    return <Ctx.Provider value={{ refreshing, refreshAll }}>{children}</Ctx.Provider>;
}

export const useRefresh = () => useContext(Ctx);
