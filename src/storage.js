import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'progress_v1';

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