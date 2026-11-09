import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { EPOCH } from '../storage';

const KEY = 'catalog_v1';
const EMPTY = { lastSync: EPOCH, sources: {}, words: {}, sourceWords: {} };
const swKey = (s) => `${s.sourceId}:${s.wordId}`;

// نسخه ذخیره‌شده روی گوشی (یا خالی، بار اول)
export async function loadCatalog() {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
    } catch {}
    return EMPTY;
}

// ادغام تغییرات سرور در نسخه محلی (idempotent)
function merge(cat, d) {
    const next = {
        lastSync: d.nextSince,
        sources: { ...cat.sources },
        words: { ...cat.words },
        sourceWords: { ...cat.sourceWords },
    };
    const apply = (map, list, k) => {
        for (const it of list) {
            if (it.deletedAt) delete map[k(it)]; // حذف‌شده روی سرور
            else map[k(it)] = it;
        }
    };
    apply(next.sources, d.sources, (s) => s.id);
    apply(next.words, d.words, (w) => w.id);
    apply(next.sourceWords, d.sourceWords, swKey);
    return next;
}

// فقط تغییرات از lastSync به بعد را می‌گیرد و ذخیره می‌کند
export async function syncCatalog(cat) {
    const { data, error } = await supabase.rpc('catalog_changes', { since: cat.lastSync });
    if (error) throw error;
    const next = merge(cat, data);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return next;
}