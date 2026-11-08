import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'progress_v1';
const SEEN_KEY = 'seen_v1';

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

export async function clearProgress() {
    try {
        await AsyncStorage.removeItem(KEY);
    } catch {}
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

        console.log(
            'AsyncStorage:\n',
            JSON.stringify(result, null, 4)
        );
    } catch (error) {
        console.error(error);
    }
}