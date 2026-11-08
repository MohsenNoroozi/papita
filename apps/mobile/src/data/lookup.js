import { WORDS } from './words';
import { SOURCES } from './sources';

const sourceMap = new Map(SOURCES.map((s) => [s.id, s]));

const wordsBySource = new Map();
for (const w of WORDS) {
    if (!wordsBySource.has(w.sourceId)) wordsBySource.set(w.sourceId, []);
    wordsBySource.get(w.sourceId).push(w);
}

// هشدار در حالت توسعه: کلمه‌ای که sourceId نامعتبر دارد
if (__DEV__) {
    for (const w of WORDS) {
        if (!sourceMap.has(w.sourceId)) {
            console.warn(`کلمه ${w.id} (${w.en}) منبعی با sourceId=${w.sourceId} ندارد`);
        }
    }
}

export function getSource(id) {
    return sourceMap.get(id);
}

export function getWordsOfSource(sourceId) {
    return wordsBySource.get(sourceId) ?? [];
}