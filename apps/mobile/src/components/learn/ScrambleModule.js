import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useSettings } from '@/context/SettingsContext';
import { shuffle } from '@/leitner';
import { speak, stopSpeaking } from '@/speech';
import { colors } from '@/theme';
import Button from '@/components/Button';
import SwipeCards, { findNext } from './SwipeCards';
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
 * هر کلمه یک کارت است؛ کشیدن به چپ = بعدی، کشیدن به راست = قبلی.
 */
export default function ScrambleModule({ words, onNext, onPrev, onRestart, onComplete }) {
    const { autoSpeak } = useSettings();
    const [items] = useState(() => shuffle(words).map(makeItem));
    const [index, setIndex] = useState(0);
    const [solved, setSolved] = useState(() => new Set());
    const [placed, setPlaced] = useState([]); // شناسه مهره‌ها به ترتیب قرارگیری
    const [status, setStatus] = useState('idle'); // idle | correct | wrong | revealed
    const [missed, setMissed] = useState([]);
    const [finished, setFinished] = useState(false);
    const timer = useRef(null);
    const cards = useRef(null);

    useEffect(
        () => () => {
            clearTimeout(timer.current);
            stopSpeaking();
        },
        []
    );

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

    const current = items[index];
    const wid = current.word.id;
    const n = current.letters.length;
    const isSolved = solved.has(wid);
    const idle = status === 'idle' && !isSolved;
    // کارت حل‌شده با رفت‌وبرگشت، پاسخ درست را نشان می‌دهد
    const shownPlaced = isSolved ? current.letters.map((_, i) => i) : placed;
    const shownStatus = isSolved ? 'correct' : status;

    // رفتن به کارت دیگر: وضعیت کارت قبلی پاک می‌شود
    const go = (i) => {
        clearTimeout(timer.current);
        timer.current = null;
        setPlaced([]);
        setStatus('idle');
        setIndex(i);
    };

    const markMissed = () => setMissed((m) => (m.includes(wid) ? m : [...m, wid]));

    const place = (id) => {
        if (!idle || placed.length >= n || placed.includes(id)) return;
        const next = [...placed, id];
        setPlaced(next);
        if (next.length < n) return;

        const guess = next.map((i) => current.letters[i]).join('').toLowerCase();
        if (guess === current.letters.join('').toLowerCase()) {
            const nextSolved = new Set(solved).add(wid);
            setSolved(nextSolved);
            setStatus('correct');
            if (autoSpeak) speak(current.word.en);
            timer.current = setTimeout(() => {
                timer.current = null;
                if (nextSolved.size === items.length) {
                    setFinished(true);
                    return;
                }
                const nx = findNext(items.length, index, (i) => nextSolved.has(items[i].word.id));
                if (nx >= 0) cards.current?.goTo(nx);
            }, 900);
        } else {
            setStatus('wrong');
            markMissed();
            timer.current = setTimeout(() => {
                timer.current = null;
                setPlaced([]);
                setStatus('idle');
            }, 900);
        }
    };

    const unplace = (k) => {
        if (!idle) return;
        setPlaced(placed.filter((_, i) => i !== k));
    };

    // نمایش پاسخ؛ بعد از آن کارت پاک می‌شود و هنوز حل‌نشده است
    const reveal = () => {
        if (!idle) return;
        setPlaced(current.letters.map((_, i) => i)); // ترتیب اصلی = اندیس‌ها
        setStatus('revealed');
        markMissed();
        timer.current = setTimeout(() => {
            timer.current = null;
            setPlaced([]);
            setStatus('idle');
        }, 1400);
    };

    // خانه‌های پاسخ (فاصله بین کلمات چندبخشی مثل "ice pop" حفظ می‌شود)
    let k = -1;
    const slots = current.word.en.split('').map((ch, i) => {
        if (ch === ' ') return <View key={`gap${i}`} style={styles.gap} />;
        k += 1;
        const pos = k;
        const id = shownPlaced[pos];
        return (
            <Pressable
                key={`slot${i}`}
                onPress={() => unplace(pos)}
                style={[
                    styles.slot,
                    id != null && styles.slotFilled,
                    (shownStatus === 'correct' || shownStatus === 'revealed') && styles.slotCorrect,
                    shownStatus === 'wrong' && styles.slotWrong,
                ]}
            >
                <Text style={styles.slotText}>{id != null ? current.letters[id] : ''}</Text>
            </Pressable>
        );
    });

    return (
        <ScrollView contentContainerStyle={styles.root}>
            <SwipeCards ref={cards} count={items.length} index={index} onChange={go}>
                <Text style={styles.question}>حروف را به ترتیب بچین</Text>

                <Pressable
                    onPress={() => speak(current.word.en)}
                    accessibilityRole="button"
                    accessibilityLabel="پخش تلفظ"
                    style={styles.faBox}
                >
                    <Text style={styles.fa}>{current.word.fa}</Text>
                </Pressable>

                <View style={styles.slotsRow}>{slots}</View>

                <View style={styles.tilesRow}>
                    {current.tiles.map((t) => {
                        const used = shownPlaced.includes(t.id);
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
                        disabled={placed.length === 0 || !idle}
                        onPress={() => setPlaced([])}
                    />
                    <Button title="نمایش پاسخ" variant="ghost" disabled={!idle} onPress={reveal} />
                </View>
            </SwipeCards>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
    question: { fontSize: 16, color: colors.sub, textAlign: 'center', marginTop: 4 },
    faBox: { backgroundColor: colors.bg, borderRadius: 18, paddingVertical: 22, paddingHorizontal: 16 },
    fa: { fontSize: 28, fontWeight: '700', color: colors.text, textAlign: 'center', writingDirection: 'rtl' },
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
        backgroundColor: colors.bg,
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