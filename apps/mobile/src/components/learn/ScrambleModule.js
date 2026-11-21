import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import Button from '@/components/Button';
import ProgressBar from '@/components/ProgressBar';
import SpeakButton from '@/components/SpeakButton';
import { ModuleDone, ModuleEmpty } from './shared';

// شناسه هر مهره = اندیس حرف در کلمه اصلی (بدون فاصله)
function makeItem(word) {
    const letters = word.en.replace(/\s+/g, '').split('');
    const order = letters.map((ch, id) => ({ id, ch }));
    let tiles = shuffle(order);
    for (let t = 0; t < 5 && new Set(letters).size > 1 && tiles.every((x, i) => x.ch === order[i].ch); t++) {
        tiles = shuffle(order);
    }
    return { id: Math.random().toString(36).slice(2), word, letters, tiles };
}

/**
 * قدم «کلمات درهم»: حروف را به ترتیب درست بچین
 */
export default function ScrambleModule({ words, onNext, onPrev, onRestart, onComplete }) {
    const { autoSpeak } = useSettings();
    const [queue, setQueue] = useState(() => shuffle(words).map(makeItem));
    const [placed, setPlaced] = useState([]); // شناسه مهره‌ها به ترتیب قرارگیری
    const [status, setStatus] = useState('idle'); // idle | correct | wrong | revealed
    const [correct, setCorrect] = useState(0);
    const [missed, setMissed] = useState([]);
    const timer = useRef(null);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

    const finished = words.length > 0 && queue.length === 0;
    useEffect(() => {
        if (finished) onComplete?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finished]);

    if (words.length === 0) return <ModuleEmpty />;

    if (finished) {
        return (
            <ModuleDone
                subtitle={`${words.length - missed.length} از ${words.length} کلمه را بار اول درست چیدی`}
                onNext={onNext}
                onPrev={onPrev}
                onRestart={onRestart}
            />
        );
    }

    const current = queue[0];
    const n = current.letters.length;

    const advance = (requeue) => {
        const rest = queue.slice(1);
        if (requeue) rest.push(makeItem(current.word));
        else setCorrect((c) => c + 1);
        setQueue(rest);
        setPlaced([]);
        setStatus('idle');
    };

    const markMissed = () =>
        setMissed((m) => (m.includes(current.word.id) ? m : [...m, current.word.id]));

    const place = (id) => {
        if (status !== 'idle' || placed.length >= n || placed.includes(id)) return;
        const next = [...placed, id];
        setPlaced(next);
        if (next.length < n) return;

        const guess = next.map((i) => current.letters[i]).join('').toLowerCase();
        if (guess === current.letters.join('').toLowerCase()) {
            setStatus('correct');
            if (autoSpeak) speak(current.word.en);
            timer.current = setTimeout(() => advance(false), 900);
        } else {
            setStatus('wrong');
            markMissed();
            timer.current = setTimeout(() => {
                setPlaced([]);
                setStatus('idle');
            }, 900);
        }
    };

    const unplace = (k) => {
        if (status !== 'idle') return;
        setPlaced(placed.filter((_, i) => i !== k));
    };

    // نمایش پاسخ؛ کلمه بعداً دوباره پرسیده می‌شود
    const reveal = () => {
        if (status !== 'idle') return;
        setPlaced(current.letters.map((_, i) => i)); // ترتیب اصلی = اندیس‌ها
        setStatus('revealed');
        markMissed();
        timer.current = setTimeout(() => advance(true), 1400);
    };

    // خانه‌های پاسخ (فاصله بین کلمات چندبخشی مثل "ice pop" حفظ می‌شود)
    let k = -1;
    const slots = current.word.en.split('').map((ch, i) => {
        if (ch === ' ') return <View key={`gap${i}`} style={styles.gap} />;
        k += 1;
        const pos = k;
        const id = placed[pos];
        return (
            <Pressable
                key={`slot${i}`}
                onPress={() => unplace(pos)}
                style={[
                    styles.slot,
                    id != null && styles.slotFilled,
                    (status === 'correct' || status === 'revealed') && styles.slotCorrect,
                    status === 'wrong' && styles.slotWrong,
                ]}
            >
                <Text style={styles.slotText}>{id != null ? current.letters[id] : ''}</Text>
            </Pressable>
        );
    });

    return (
        <ScrollView contentContainerStyle={styles.root}>
            <ProgressBar value={correct / words.length} />
            <Text style={styles.question}>حروف را به ترتیب بچین</Text>

            <View style={styles.faBox}>
                <Text style={styles.fa}>{current.word.fa}</Text>
            </View>
            <SpeakButton text={current.word.en} size={20} style={styles.speak} />

            <View style={styles.slotsRow}>{slots}</View>

            <View style={styles.tilesRow}>
                {current.tiles.map((t) => {
                    const used = placed.includes(t.id);
                    return (
                        <Pressable
                            key={t.id}
                            onPress={() => place(t.id)}
                            disabled={used}
                            style={[styles.tile, used && styles.tileUsed]}
                        >
                            <Text style={styles.tileText}>{t.ch}</Text>
                        </Pressable>
                    );
                })}
            </View>

            <View style={styles.actions}>
                <Button
                    title="پاک کردن"
                    variant="soft"
                    disabled={placed.length === 0 || status !== 'idle'}
                    onPress={() => setPlaced([])}
                />
                <Button title="نمایش پاسخ" variant="ghost" disabled={status !== 'idle'} onPress={reveal} />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { padding: 20, gap: 14 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 8 },
    faBox: { backgroundColor: colors.card, borderRadius: 18, paddingVertical: 22, paddingHorizontal: 16 },
    fa: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
    speak: { alignSelf: 'center' },
    slotsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 6,
        direction: 'ltr',
        marginTop: 4,
    },
    gap: { width: 16 },
    slot: {
        width: 42,
        height: 50,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slotFilled: { borderColor: colors.primary },
    slotCorrect: { backgroundColor: colors.successSoft, borderColor: colors.success },
    slotWrong: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    slotText: { fontSize: 24, fontWeight: '800', color: colors.text },
    tilesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        direction: 'ltr',
        marginTop: 8,
    },
    tile: {
        width: 46,
        height: 54,
        borderRadius: 14,
        backgroundColor: colors.primarySoft,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileUsed: { opacity: 0 },
    tileText: { fontSize: 26, fontWeight: '800', color: colors.primary },
    actions: { gap: 4, marginTop: 8 },
});