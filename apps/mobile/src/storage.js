import AsyncStorage from '@react-native-async-storage/async-storage';

export const EPOCH = '1970-01-01T00:00:00Z';

const KEY = 'progress_v1';
const SEEN_KEY = 'seen_v1';
const OUTBOX_KEY = 'outbox_v1';
const SINCE_KEY = 'progress_since_v1';

// همه داده‌های وابسته به کاربر و کاتالوگ (برای خروج از حساب یا عوض شدن کاربر)
const ALL_KEYS = [
    'progress_v1',
    'seen_v1',
    'settings_v1',
    'catalog_v1',
    'outbox_v1',
    'progress_since_v1',
];

export async function wipeLocal() {
    try {
        await AsyncStorage.multiRemove(ALL_KEYS);
    } catch {}
}

export async function loadProgress() {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export async function saveProgress(progress) {
    try {
        await AsyncStorage.setItem(KEY, JSON.stringify(progress));
    } catch (e) {
        console.warn('save failed', e);
    }
}

export async function loadSeen() {
    try {
        const raw = await AsyncStorage.getItem(SEEN_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

export async function saveSeen(seen) {
    try {
        await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch (e) {
        console.warn('save seen failed', e);
    }
}

export async function clearSeen() {
    try {
        await AsyncStorage.removeItem(SEEN_KEY);
    } catch {}
}

// صف تغییرات ارسال‌نشده + نشانه آخرین sync پیشرفت
export async function loadSync() {
    try {
        const [o, s] = await Promise.all([
            AsyncStorage.getItem(OUTBOX_KEY),
            AsyncStorage.getItem(SINCE_KEY),
        ]);
        return { outbox: o ? JSON.parse(o) : {}, since: s || EPOCH };
    } catch {
        return { outbox: {}, since: EPOCH };
    }
}

export const saveOutbox = (outbox) =>
    AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox)).catch(() => {});

export const saveSince = (since) => AsyncStorage.setItem(SINCE_KEY, since).catch(() => {});

export async function inspectStorage() {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const stores = await AsyncStorage.multiGet(keys);
        const result = Object.fromEntries(
            stores.map(([key, value]) => {
                try {
                    return [key, JSON.parse(value)];
                } catch {
                    return [key, value];
                }
            })
        );
        console.log('AsyncStorage:\n', JSON.stringify(result, null, 4));
    } catch (error) {
        console.error(error);
    }
}